"""
Thread-safe in-memory TTL cache.

Features:
  - Per-key TTL expiration
  - Max size with LRU eviction
  - Cache hit/miss statistics
  - Thread-safe operations
"""

import time
import threading
import hashlib
import json
from typing import Any, Optional
from collections import OrderedDict
from middleware.logging_config import logger


class CacheEntry:
    __slots__ = ("value", "expires_at", "created_at")

    def __init__(self, value: Any, ttl: float):
        self.value = value
        self.created_at = time.time()
        self.expires_at = self.created_at + ttl

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class TTLCache:
    """
    In-memory cache with TTL expiration and LRU eviction.

    Usage:
        cache = TTLCache(name="models", default_ttl=300, max_size=100)

        # Try cache first
        result = cache.get("key")
        if result is None:
            result = expensive_operation()
            cache.set("key", result)
    """

    def __init__(self, name: str, default_ttl: float = 300.0, max_size: int = 256):
        self.name = name
        self.default_ttl = default_ttl
        self.max_size = max_size

        self._store: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Get a value from cache. Returns None if not found or expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None

            if entry.is_expired:
                del self._store[key]
                self._misses += 1
                return None

            # Move to end (most recently used)
            self._store.move_to_end(key)
            self._hits += 1
            return entry.value

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """Store a value in cache with optional custom TTL."""
        effective_ttl = ttl if ttl is not None else self.default_ttl

        with self._lock:
            # Remove old entry if exists
            if key in self._store:
                del self._store[key]

            # Evict LRU entries if at capacity
            while len(self._store) >= self.max_size:
                self._store.popitem(last=False)

            self._store[key] = CacheEntry(value, effective_ttl)

    def invalidate(self, key: str) -> bool:
        """Remove a specific key from cache. Returns True if key existed."""
        with self._lock:
            if key in self._store:
                del self._store[key]
                return True
            return False

    def clear(self) -> int:
        """Clear all entries. Returns number of entries removed."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
            logger.info(
                f"Cache '{self.name}' cleared ({count} entries)",
                extra={"extra_data": {"event": "cache_clear", "cache": self.name, "entries_removed": count}},
            )
            return count

    def cleanup_expired(self) -> int:
        """Remove all expired entries. Returns count of removed entries."""
        with self._lock:
            expired_keys = [k for k, v in self._store.items() if v.is_expired]
            for key in expired_keys:
                del self._store[key]
            return len(expired_keys)

    @property
    def stats(self) -> dict[str, Any]:
        """Return cache statistics."""
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0.0
            return {
                "name": self.name,
                "size": len(self._store),
                "max_size": self.max_size,
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate_percent": round(hit_rate, 1),
                "default_ttl_seconds": self.default_ttl,
            }


def make_cache_key(*args, **kwargs) -> str:
    """Generate a deterministic cache key from arguments."""
    key_data = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
    return hashlib.sha256(key_data.encode()).hexdigest()[:16]


# Application-wide cache instances
model_catalog_cache = TTLCache(name="model_catalog", default_ttl=600, max_size=16)
recommendation_cache = TTLCache(name="recommendations", default_ttl=120, max_size=128)
cost_estimate_cache = TTLCache(name="cost_estimates", default_ttl=300, max_size=64)
azure_api_cache = TTLCache(name="azure_api", default_ttl=180, max_size=32)
