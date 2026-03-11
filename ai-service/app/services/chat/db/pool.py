"""
db/pool.py
Thread-safe PostgreSQL connection pool using psycopg2.pool.
Replaces raw connect/close per query with a managed pool.
"""
from __future__ import annotations

import threading
from contextlib import contextmanager
from typing import Generator

import psycopg2
import psycopg2.pool
from psycopg2.extras import RealDictCursor
from loguru import logger # type: ignore

from config.settings import DB_CONFIG


class DatabasePool:
    """
    Singleton thread-safe connection pool.
    Usage:
        with db_pool.get_cursor() as cur:
            cur.execute("SELECT 1")
            rows = cur.fetchall()
    """
    _instance: DatabasePool | None = None
    _lock = threading.Lock()

    def __new__(cls) -> DatabasePool:
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._pool = None
        return cls._instance

    def _ensure_pool(self) -> None:
        if self._pool is None:
            logger.info(
                f"Initializing DB pool → {DB_CONFIG.host}:{DB_CONFIG.port}/{DB_CONFIG.name} "
                f"(min={DB_CONFIG.min_connections}, max={DB_CONFIG.max_connections})"
            )
            self._pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=DB_CONFIG.min_connections,
                maxconn=DB_CONFIG.max_connections,
                dsn=DB_CONFIG.dsn(),
            )
            # ── Fix: PostgreSQL không có ROUND(double precision, int)
            # Tạo overloaded function để ROUND(float, N) hoạt động đúng
            self._create_round_overload()

    def _create_round_overload(self) -> None:
        """Create ROUND(double precision, integer) if not exists."""
        try:
            conn = self._pool.getconn()
            try:
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute("""
                        CREATE OR REPLACE FUNCTION round(double precision, integer)
                        RETURNS numeric AS $$
                            SELECT round($1::numeric, $2);
                        $$ LANGUAGE sql IMMUTABLE STRICT;
                    """)
                logger.info("DB: ROUND(double precision, integer) overload created ✓")
            except Exception as e:
                logger.warning(f"DB: Could not create ROUND overload (may already exist): {e}")
            finally:
                conn.autocommit = False
                self._pool.putconn(conn)
        except Exception as e:
            logger.warning(f"DB: Pool init helper failed: {e}")

    @contextmanager
    def get_connection(self) -> Generator:
        """Yield a raw connection from the pool."""
        self._ensure_pool()
        conn = self._pool.getconn()
        try:
            conn.autocommit = False
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)

    @contextmanager
    def get_cursor(self, dict_cursor: bool = True) -> Generator:
        """Yield a cursor; commits/rolls back automatically."""
        factory = RealDictCursor if dict_cursor else None
        with self.get_connection() as conn:
            cur = conn.cursor(cursor_factory=factory)
            try:
                yield cur
            finally:
                cur.close()

    def close_all(self) -> None:
        if self._pool:
            self._pool.closeall()
            self._pool = None
            logger.info("DB pool closed.")


# Module-level singleton
db_pool = DatabasePool()