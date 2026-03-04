"""
config/settings.py
Centralized configuration using Pydantic BaseSettings.
All values can be overridden via environment variables.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List


@dataclass(frozen=True)
class DatabaseConfig:
    name: str = field(default_factory=lambda: os.getenv("DB_NAME", "fams_db"))
    user: str = field(default_factory=lambda: os.getenv("DB_USER", "postgres"))
    password: str = field(default_factory=lambda: os.getenv("DB_PASSWORD", "postgres123"))
    host: str = field(default_factory=lambda: os.getenv("DB_HOST", "postgres"))
    port: int = field(default_factory=lambda: int(os.getenv("DB_PORT", "5432")))
    min_connections: int = 2
    max_connections: int = 10

    @property
    def dsn(self) -> str:
        return (
            f"dbname={self.name} user={self.user} password={self.password} "
            f"host={self.host} port={self.port}"
        )


@dataclass(frozen=True)
class LLMConfig:
    api_key: str = field(default_factory=lambda: os.getenv("GROQ_API_KEY", ""))
    base_url: str = field(default_factory=lambda: os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"))
    primary_model: str = field(default_factory=lambda: os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"))
    fallback_models: List[str] = field(default_factory=lambda: [
        "llama-3.1-8b-instant",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "qwen/qwen3-32b",
        "moonshotai/kimi-k2-instruct-0905",
    ])
    timeout: int = field(default_factory=lambda: int(os.getenv("LLM_TIMEOUT", "45")))
    max_retries: int = field(default_factory=lambda: int(os.getenv("LLM_MAX_RETRIES", "2")))
    retry_delay: float = field(default_factory=lambda: float(os.getenv("LLM_RETRY_DELAY", "0.5")))
    temperature: float = 0.3
    max_tokens: int = 1024
    top_p: float = 0.9


@dataclass(frozen=True)
class CacheConfig:
    max_size: int = 100


# Singleton instances
DB_CONFIG = DatabaseConfig()
LLM_CONFIG = LLMConfig()
CACHE_CONFIG = CacheConfig()