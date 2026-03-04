"""
services/llm_client.py
Thin wrapper around the Groq/OpenAI-compatible completion API.
Handles:
  • Model rotation & retry with exponential back-off
  • Stripping <thought> tags from responses
  • Clean error propagation
"""
from __future__ import annotations

import json
import re
import time
from typing import Optional, Generator

import requests
from loguru import logger

from config.settings import LLM_CONFIG

_THOUGHT_RE = re.compile(r"<thought>.*?</thought>", re.S)


class LLMClient:
    """
    Stateless HTTP client. Can be injected into any service.
    Thread-safe (no shared mutable state).
    """

    def __init__(self, config=LLM_CONFIG) -> None:
        self.cfg = config
        self._base_url = f"{config.base_url}/chat/completions"
        self._headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
        }

    def complete(self, prompt: str, model: Optional[str] = None) -> str:
        """
        Send a prompt and return the assistant content string.
        Rotates through fallback models on rate-limit / error.
        Raises RuntimeError if all retries are exhausted.
        """
        primary = model or self.cfg.primary_model
        model_queue = [primary] + [m for m in self.cfg.fallback_models if m != primary]
        tried: set[str] = set()
        last_error: Exception | str = "No attempts made"

        for attempt in range(self.cfg.max_retries + 1):
            current = self._next_model(model_queue, tried)
            tried.add(current)

            if attempt:
                delay = self.cfg.retry_delay * (2 ** (attempt - 1))
                logger.info(f"[LLM] Retry {attempt}/{self.cfg.max_retries} → {current} (wait {delay:.1f}s)")
                time.sleep(delay)

            try:
                content = self._call(current, prompt)
                return content
            except RateLimitError as e:
                logger.warning(f"[LLM] 429 on {current}: {e}")
                last_error = e
            except Exception as e:
                logger.error(f"[LLM] Error on {current} (attempt {attempt + 1}): {e}")
                last_error = e
                if attempt == self.cfg.max_retries:
                    raise

        raise RuntimeError(
            f"LLM failed after {self.cfg.max_retries} retries. Last error: {last_error}"
        )

    def stream_complete(self, prompt: str, model: Optional[str] = None):
        """
        Streaming version of complete(). Yields text chunks.
        """
        primary = model or self.cfg.primary_model
        model_queue = [primary] + [m for m in self.cfg.fallback_models if m != primary]
        
        # For streaming, we'll try models in queue. If 429/error, we move to next.
        # Note: Streaming retries are slightly trickier if half-way through.
        # But here we assume if the connection starts, we stick with it.
        for current in model_queue:
            try:
                payload = {
                    "model": current,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": self.cfg.temperature,
                    "max_tokens": self.cfg.max_tokens,
                    "stream": True
                }
                
                resp = requests.post(
                    self._base_url,
                    headers=self._headers,
                    json=payload,
                    timeout=self.cfg.timeout,
                    stream=True
                )
                
                if resp.status_code != 200:
                    logger.warning(f"[LLM] Stream error {resp.status_code} on {current}")
                    continue

                for line in resp.iter_lines():
                    if not line:
                        continue
                    
                    line_str = line.decode("utf-8")
                    if line_str.startswith("data: "):
                        data_str = line_str[6:].strip()
                        if data_str == "[DONE]":
                            break
                        
                        try:
                            chunk = json.loads(data_str)
                            delta = chunk["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except Exception as e:
                            logger.error(f"[LLM] Stream parse error: {e}")
                            continue
                return # Success
            except Exception as e:
                logger.error(f"[LLM] Stream attempt failed on {current}: {e}")
                continue
        
        raise RuntimeError("LLM Streaming failed on all models.")

    # ── Private ──────────────────────────────────────────────────────────────
    def _call(self, model: str, prompt: str) -> str:
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.cfg.temperature,
            "max_tokens": self.cfg.max_tokens,
            "top_p": self.cfg.top_p,
        }
        resp = requests.post(
            self._base_url,
            headers=self._headers,
            json=payload,
            timeout=self.cfg.timeout,
        )

        if resp.status_code == 429:
            raise RateLimitError(f"429 Too Many Requests from {model}")

        if resp.status_code != 200:
            raise RuntimeError(f"HTTP {resp.status_code} ({resp.reason}): {resp.text[:300]}")

        content: str = resp.json()["choices"][0]["message"]["content"]
        content = _THOUGHT_RE.sub("", content).strip()
        logger.debug(f"[LLM] {model} response: {content[:120]}…")
        return content

    @staticmethod
    def _next_model(queue: list[str], tried: set[str]) -> str:
        for m in queue:
            if m not in tried:
                return m
        return queue[0]  # all tried → cycle back


class RateLimitError(Exception):
    pass


# Module-level default client
llm_client = LLMClient()