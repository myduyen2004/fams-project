"""
config/settings.py
Centralized configuration using dataclasses.
All values can be overridden via environment variables.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List


@dataclass(frozen=True)
class DatabaseConfig:
    name:            str = field(default_factory=lambda: os.getenv("DB_NAME",     "fams_db"))
    user:            str = field(default_factory=lambda: os.getenv("DB_USER",     "postgres"))
    password:        str = field(default_factory=lambda: os.getenv("DB_PASSWORD", "postgres123"))
    host:            str = field(default_factory=lambda: os.getenv("DB_HOST",     "postgres"))
    port:            int = field(default_factory=lambda: int(os.getenv("DB_PORT", "5432")))
    min_connections: int = 2
    max_connections: int = 10

    # ✅ FIX: Thụt lề đúng — @property bên trong dataclass frozen cần dùng __post_init__ trick
    # Với frozen=True, ta không thể dùng @property trực tiếp trong dataclass
    # → Chuyển thành method thông thường
    def dsn(self) -> str:
        return (
            f"dbname={self.name} user={self.user} password={self.password} "
            f"host={self.host} port={self.port}"
        )


@dataclass(frozen=True)
class LLMConfig:
    # GROQ_API_KEY_POOL: keys từ NHIỀU account khác nhau (mỗi account ~30 req/min riêng)
    # Format: key1,key2,key3 (comma-separated)
    # Nếu không set → fallback về GROQ_API_KEY (keys cùng account)
    api_keys: List[str] = field(
        default_factory=lambda: [
            k.strip()
            for k in os.getenv(
                "GROQ_API_KEY_POOL",
                os.getenv("GROQ_API_KEY", "")
            ).split(",")
            if k.strip()
        ]
    )
    base_url:      str = field(default_factory=lambda: os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"))
    primary_model: str = field(default_factory=lambda: os.getenv("GROQ_MODEL",    "llama-3.1-8b-instant"))

    # ✅ FIX: Thêm nhiều fallback model hơn để tránh 429 trên một model duy nhất
    # Groq free tier giới hạn per-model, nên rotate sang model khác khi bị 429
    fallback_models: List[str] = field(default_factory=lambda: [
        m.strip()
        for m in os.getenv(
            "GROQ_FALLBACK_MODELS",
            "llama-3.1-8b-instant,gemma2-9b-it,llama-3.3-70b-versatile"
        ).split(",")
        if m.strip()
    ])

    timeout:     int   = field(default_factory=lambda: int(os.getenv("LLM_TIMEOUT",      "15")))
    max_retries: int   = field(default_factory=lambda: int(os.getenv("LLM_MAX_RETRIES",  "3")))
    retry_delay: float = field(default_factory=lambda: float(os.getenv("LLM_RETRY_DELAY", "1.0")))
    temperature: float = 0.3
    max_tokens:  int   = 768
    top_p:       float = 0.9


@dataclass(frozen=True)
class CacheConfig:
    # Hard router LRU cache size
    max_size: int = field(default_factory=lambda: int(os.getenv("CACHE_MAX_SIZE", "200")))
    # Light router routing cache size (separate)
    route_cache_size: int = field(default_factory=lambda: int(os.getenv("ROUTE_CACHE_SIZE", "300")))


# ── Singleton instances ───────────────────────────────────────────────────────
DB_CONFIG    = DatabaseConfig()
LLM_CONFIG   = LLMConfig()
CACHE_CONFIG = CacheConfig()