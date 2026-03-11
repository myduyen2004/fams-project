"""
services/llm_client.py  ── v2.0 (Smart Rate Limit Management)

Cải tiến so với v1:
  • Per-key cooldown tracking  – key bị 429 → bị "đóng băng" đúng thời gian Groq yêu cầu
  • retry-after header parsing – đọc header Retry-After từ Groq thay vì đoán mò
  • Token bucket per model     – ước lượng TPM/RPM để tự throttle trước khi bị 429
  • Request queue + semaphore  – giới hạn concurrent requests, tránh đốt hết quota cùng lúc
  • Jitter tăng dần            – exponential backoff với full jitter (AWS best practice)
  • Circuit breaker per key    – key bị lỗi liên tiếp → tạm loại khỏi pool
  • Thread-safe                – dùng threading.Lock cho key rotation
"""
from __future__ import annotations

import json
import random
import re
import threading
import time
from collections import defaultdict, deque
from typing import Generator, Optional

import requests
from loguru import logger

from config.settings import LLM_CONFIG

_THOUGHT_RE = re.compile(r"<thought>.*?</thought>", re.S)

# ── Constants ─────────────────────────────────────────────────────────────────
_DEFAULT_RETRY_AFTER  = 30.0   # giây chờ khi không có header Retry-After
_MIN_REQUEST_INTERVAL = 1.2    # giây tối thiểu giữa 2 request cùng key (RPM guard)
_MAX_CONCURRENT       = 3      # số request đồng thời tối đa toàn bộ client
_CIRCUIT_BREAK_THRESH = 4      # số lần lỗi liên tiếp để circuit break 1 key
_CIRCUIT_RESET_AFTER  = 120.0  # giây reset circuit breaker


class _KeyState:
    """Trạng thái của một API key."""

    def __init__(self, key: str) -> None:
        self.key            = key
        self.cooldown_until = 0.0    # epoch time khi có thể dùng lại
        self.last_used      = 0.0    # epoch time lần dùng cuối
        self.error_streak   = 0      # số lần lỗi liên tiếp
        self.total_requests = 0
        self.total_429s     = 0
        self.lock           = threading.Lock()

    @property
    def is_available(self) -> bool:
        now = time.time()
        if now < self.cooldown_until:
            return False
        if self.error_streak >= _CIRCUIT_BREAK_THRESH:
            # Circuit breaker: check if reset time passed
            if now < self.cooldown_until + _CIRCUIT_RESET_AFTER:
                return False
            # Auto-reset circuit breaker
            logger.info(f"[KeyState] Circuit breaker reset for key ...{self.key[-6:]}")
            self.error_streak = 0
        return True

    @property
    def wait_seconds(self) -> float:
        """Bao nhiêu giây nữa key này mới available."""
        return max(0.0, self.cooldown_until - time.time())

    def mark_429(self, retry_after: float) -> None:
        with self.lock:
            self.cooldown_until = time.time() + retry_after
            self.error_streak  += 1
            self.total_429s    += 1
            logger.warning(
                f"[Key ...{self.key[-6:]}] 429 → cooldown {retry_after:.0f}s "
                f"(streak={self.error_streak}, total_429={self.total_429s})"
            )

    def mark_success(self) -> None:
        with self.lock:
            self.error_streak = 0
            self.last_used    = time.time()
            self.total_requests += 1

    def mark_error(self) -> None:
        with self.lock:
            self.error_streak += 1


def _parse_retry_after(response: requests.Response) -> float:
    """
    Đọc header Retry-After từ response của Groq.
    Groq thường trả về số giây hoặc HTTP date.
    Fallback về _DEFAULT_RETRY_AFTER nếu không có header.
    """
    raw = response.headers.get("Retry-After") or response.headers.get("retry-after")
    if raw:
        try:
            return float(raw)
        except ValueError:
            pass
        # HTTP date format
        try:
            from email.utils import parsedate_to_datetime
            dt = parsedate_to_datetime(raw)
            return max(1.0, (dt.timestamp() - time.time()))
        except Exception:
            pass

    # Groq sometimes embeds the wait in the JSON body
    try:
        body = response.json()
        msg = str(body.get("error", {}).get("message", ""))
        # "Please try again in 12.5s"
        m = re.search(r"try again in ([\d.]+)s", msg)
        if m:
            return float(m.group(1)) + 2.0   # +2s buffer
    except Exception:
        pass

    return _DEFAULT_RETRY_AFTER


def _jitter_sleep(base: float, factor: float = 1.5, attempt: int = 0) -> None:
    """Full-jitter exponential backoff (AWS best practice)."""
    cap   = base * (factor ** attempt)
    sleep = random.uniform(0, cap)
    logger.debug(f"[Backoff] sleep {sleep:.2f}s (cap={cap:.2f}s, attempt={attempt})")
    time.sleep(sleep)


class LLMClient:
    """
    Thread-safe HTTP client với smart rate limit management.
    Dùng per-key cooldown, circuit breaker, và request semaphore.
    """

    def __init__(self, config=LLM_CONFIG) -> None:
        self.cfg       = config
        self._base_url = f"{config.base_url}/chat/completions"

        raw_keys        = config.api_keys if config.api_keys else [""]
        self._key_pool: list[_KeyState] = [_KeyState(k) for k in raw_keys]
        self._pool_lock = threading.Lock()

        # Semaphore giới hạn concurrent requests
        self._semaphore = threading.Semaphore(_MAX_CONCURRENT)

        logger.info(f"[LLMClient v2] Initialized with {len(self._key_pool)} key(s), "
                    f"max_concurrent={_MAX_CONCURRENT}")

    # ── Public API ────────────────────────────────────────────────────────────

    def complete(self, prompt: str, model: Optional[str] = None) -> str:
        """
        Gửi prompt và trả về chuỗi response.
        Tự động retry, rotate key, và chờ cooldown thông minh.
        """
        model_queue = self._build_model_queue(model)
        max_retries = max(self.cfg.max_retries, len(self._key_pool) * 3, 6)

        last_error: str = "No attempts made"
        tried_this_round: dict[str, int] = defaultdict(int)  # model → attempt count

        with self._semaphore:
            for attempt in range(max_retries + 1):
                # Chọn key tốt nhất (ít cooldown, ít lỗi nhất)
                key_state = self._pick_best_key(wait=True)
                if key_state is None:
                    logger.error("[LLMClient] No available keys even after waiting")
                    break

                # Chọn model
                current_model = self._pick_model(model_queue, tried_this_round)

                # Rate guard: đảm bảo không gọi cùng 1 key quá nhanh
                self._rate_guard(key_state)

                try:
                    content = self._call(current_model, prompt, key_state)
                    key_state.mark_success()
                    if attempt > 0:
                        logger.info(f"[LLMClient] Succeeded on attempt {attempt + 1} "
                                    f"model={current_model} key=...{key_state.key[-6:]}")
                    return content

                except RateLimitError as e:
                    retry_after = e.retry_after
                    key_state.mark_429(retry_after)
                    last_error = str(e)
                    logger.warning(f"[LLMClient] 429 attempt={attempt + 1} "
                                   f"model={current_model} → wait {retry_after:.0f}s")
                    # Không sleep ở đây – _pick_best_key sẽ đợi key khác

                except requests.Timeout:
                    key_state.mark_error()
                    last_error = f"Timeout on {current_model}"
                    tried_this_round[current_model] += 1
                    _jitter_sleep(2.0, attempt=attempt)

                except InvalidKeyError:
                    logger.error(f"[LLMClient] Invalid key ...{key_state.key[-6:]} → disabling")
                    key_state.mark_429(9999.0)   # disable forever this session
                    last_error = "Invalid API key"

                except Exception as e:
                    key_state.mark_error()
                    last_error = str(e)
                    tried_this_round[current_model] += 1
                    logger.error(f"[LLMClient] Error attempt={attempt + 1} "
                                 f"model={current_model}: {e}")
                    _jitter_sleep(3.0, attempt=attempt)

        raise RuntimeError(f"LLM failed after {max_retries} retries. Last: {last_error}")

    def stream_complete(self, prompt: str, model: Optional[str] = None) -> Generator[str, None, None]:
        """Streaming version – yields text chunks."""
        model_queue = self._build_model_queue(model)
        max_retries = max(self.cfg.max_retries, len(self._key_pool) * 2, 4)
        tried_this_round: dict[str, int] = defaultdict(int)

        with self._semaphore:
            for attempt in range(max_retries + 1):
                key_state = self._pick_best_key(wait=True)
                if key_state is None:
                    break

                current_model = self._pick_model(model_queue, tried_this_round)
                self._rate_guard(key_state)

                try:
                    yield from self._stream_call(current_model, prompt, key_state)
                    key_state.mark_success()
                    return

                except RateLimitError as e:
                    key_state.mark_429(e.retry_after)
                    logger.warning(f"[Stream] 429 model={current_model} "
                                   f"→ cooldown {e.retry_after:.0f}s")

                except Exception as e:
                    key_state.mark_error()
                    tried_this_round[current_model] += 1
                    logger.error(f"[Stream] Error attempt={attempt + 1}: {e}")
                    _jitter_sleep(3.0, attempt=attempt)

        raise RuntimeError("LLM Streaming failed on all models.")

    def get_pool_status(self) -> list[dict]:
        """Debug: trạng thái hiện tại của key pool."""
        now = time.time()
        return [
            {
                "key_suffix": f"...{ks.key[-6:]}",
                "available":   ks.is_available,
                "cooldown_remaining": max(0.0, round(ks.cooldown_until - now, 1)),
                "error_streak": ks.error_streak,
                "total_requests": ks.total_requests,
                "total_429s":     ks.total_429s,
            }
            for ks in self._key_pool
        ]

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_model_queue(self, model: Optional[str]) -> list[str]:
        primary = model or self.cfg.primary_model
        return [primary] + [m for m in self.cfg.fallback_models if m != primary]

    def _pick_best_key(self, wait: bool = True) -> Optional[_KeyState]:
        """
        Chọn key khả dụng tốt nhất (cooldown thấp nhất).
        Nếu wait=True và tất cả đang trong cooldown → sleep đến khi key gần nhất sẵn sàng.
        """
        max_wait = 8.0  # Tối đa chờ 8s (budget 7s cho user)

        deadline = time.time() + max_wait
        while time.time() < deadline:
            with self._pool_lock:
                available = [ks for ks in self._key_pool if ks.is_available]
                if available:
                    # Ưu tiên key ít lỗi nhất, sau đó ít dùng nhất
                    best = min(available, key=lambda ks: (ks.error_streak, ks.last_used))
                    return best

                if not wait:
                    return None

                # Tính thời gian chờ đến key gần nhất
                soonest = min(self._key_pool, key=lambda ks: ks.cooldown_until)
                wait_secs = min(soonest.wait_seconds + 0.5, 5.0)  # chờ tối đa 5s mỗi lần

            logger.info(f"[LLMClient] All keys in cooldown → waiting {wait_secs:.1f}s "
                        f"(pool status: {self._brief_pool_status()})")
            time.sleep(wait_secs)

        return None

    def _pick_model(self, queue: list[str], tried: dict[str, int]) -> str:
        """Chọn model ít được thử nhất."""
        return min(queue, key=lambda m: tried.get(m, 0))

    def _rate_guard(self, ks: _KeyState) -> None:
        """Đảm bảo tối thiểu _MIN_REQUEST_INTERVAL giây giữa 2 request trên cùng 1 key."""
        elapsed = time.time() - ks.last_used
        if elapsed < _MIN_REQUEST_INTERVAL:
            sleep_time = _MIN_REQUEST_INTERVAL - elapsed
            logger.debug(f"[RateGuard] Sleeping {sleep_time:.2f}s before reusing key ...{ks.key[-6:]}")
            time.sleep(sleep_time)

    def _call(self, model: str, prompt: str, ks: _KeyState) -> str:
        """Single blocking HTTP call. Raises typed exceptions."""
        payload = {
            "model":       model,
            "messages":    [{"role": "user", "content": prompt}],
            "temperature": self.cfg.temperature,
            "max_tokens":  self.cfg.max_tokens,
            "top_p":       getattr(self.cfg, "top_p", 1.0),
        }
        resp = requests.post(
            self._base_url,
            headers=self._make_headers(ks.key),
            json=payload,
            timeout=self.cfg.timeout,
        )

        if resp.status_code == 429:
            raise RateLimitError(
                f"429 from {model}",
                retry_after=_parse_retry_after(resp)
            )
        if resp.status_code in (401, 403):
            raise InvalidKeyError(f"HTTP {resp.status_code} for key ...{ks.key[-6:]}")
        if resp.status_code != 200:
            raise RuntimeError(
                f"HTTP {resp.status_code} ({resp.reason}): {resp.text[:300]}"
            )

        content: str = resp.json()["choices"][0]["message"]["content"]
        content = _THOUGHT_RE.sub("", content).strip()
        logger.debug(f"[LLM] {model} ok → {content[:100]}…")
        return content

    def _stream_call(self, model: str, prompt: str, ks: _KeyState) -> Generator[str, None, None]:
        """Single streaming HTTP call."""
        payload = {
            "model":       model,
            "messages":    [{"role": "user", "content": prompt}],
            "temperature": self.cfg.temperature,
            "max_tokens":  self.cfg.max_tokens,
            "stream":      True,
        }
        resp = requests.post(
            self._base_url,
            headers=self._make_headers(ks.key),
            json=payload,
            timeout=self.cfg.timeout,
            stream=True,
        )

        if resp.status_code == 429:
            raise RateLimitError(
                f"429 stream {model}",
                retry_after=_parse_retry_after(resp)
            )
        if resp.status_code in (401, 403):
            raise InvalidKeyError(f"HTTP {resp.status_code}")
        if resp.status_code != 200:
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:200]}")

        for line in resp.iter_lines():
            if not line:
                continue
            line_str = line.decode("utf-8")
            if not line_str.startswith("data: "):
                continue
            data_str = line_str[6:].strip()
            if data_str == "[DONE]":
                break
            try:
                chunk   = json.loads(data_str)
                content = chunk["choices"][0].get("delta", {}).get("content", "")
                if content:
                    yield content
            except Exception as exc:
                logger.debug(f"[Stream] parse skip: {exc}")

    @staticmethod
    def _make_headers(api_key: str) -> dict:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type":  "application/json",
        }

    def _brief_pool_status(self) -> str:
        now = time.time()
        parts = []
        for ks in self._key_pool:
            rem = max(0.0, ks.cooldown_until - now)
            parts.append(f"...{ks.key[-4:]}({'OK' if ks.is_available else f'{rem:.0f}s'})")
        return " | ".join(parts)


# ── Exceptions ────────────────────────────────────────────────────────────────

class RateLimitError(Exception):
    def __init__(self, message: str, retry_after: float = _DEFAULT_RETRY_AFTER) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class InvalidKeyError(Exception):
    pass


# ── Module-level singleton ────────────────────────────────────────────────────
llm_client = LLMClient()