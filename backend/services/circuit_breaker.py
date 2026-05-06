"""
Circuit Breaker pattern implementation.

States:
  - CLOSED: Normal operation, requests pass through. Failures are counted.
  - OPEN: Service is considered down. Requests fail fast without calling the service.
  - HALF_OPEN: After a recovery timeout, allow one test request through.

Transitions:
  CLOSED → OPEN: When failure_count >= failure_threshold
  OPEN → HALF_OPEN: After recovery_timeout seconds
  HALF_OPEN → CLOSED: If test request succeeds
  HALF_OPEN → OPEN: If test request fails
"""

import time
import threading
from enum import Enum
from typing import Any, Callable, Optional
from middleware.logging_config import logger


class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreakerError(Exception):
    """Raised when circuit is open and call is rejected."""

    def __init__(self, service_name: str, time_until_retry: float):
        self.service_name = service_name
        self.time_until_retry = time_until_retry
        super().__init__(
            f"Circuit breaker OPEN for '{service_name}'. "
            f"Retry in {time_until_retry:.1f}s"
        )


class CircuitBreaker:
    """
    Thread-safe circuit breaker for external service calls.

    Usage:
        breaker = CircuitBreaker("azure-api", failure_threshold=3, recovery_timeout=30)

        try:
            result = breaker.call(some_external_function, arg1, arg2)
        except CircuitBreakerError:
            # Use fallback/cached data
            result = fallback_data
    """

    def __init__(
        self,
        service_name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 30.0,
        success_threshold: int = 2,
    ):
        self.service_name = service_name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._last_state_change: float = time.time()
        self._lock = threading.Lock()

    @property
    def state(self) -> CircuitState:
        with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if recovery timeout has elapsed
                if self._last_failure_time and (
                    time.time() - self._last_failure_time >= self.recovery_timeout
                ):
                    self._transition_to(CircuitState.HALF_OPEN)
            return self._state

    @property
    def stats(self) -> dict[str, Any]:
        """Return current circuit breaker statistics."""
        with self._lock:
            return {
                "service": self.service_name,
                "state": self._state.value,
                "failure_count": self._failure_count,
                "success_count": self._success_count,
                "failure_threshold": self.failure_threshold,
                "recovery_timeout_seconds": self.recovery_timeout,
                "last_failure": self._last_failure_time,
                "seconds_since_state_change": round(
                    time.time() - self._last_state_change, 1
                ),
            }

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute a function through the circuit breaker.

        Raises CircuitBreakerError if the circuit is open.
        """
        current_state = self.state  # Property handles OPEN → HALF_OPEN transition

        if current_state == CircuitState.OPEN:
            time_until_retry = self.recovery_timeout - (
                time.time() - (self._last_failure_time or time.time())
            )
            raise CircuitBreakerError(self.service_name, max(0, time_until_retry))

        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure(e)
            raise

    def _on_success(self):
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.success_threshold:
                    self._transition_to(CircuitState.CLOSED)
            else:
                # Reset failure count on success in closed state
                self._failure_count = 0
                self._success_count += 1

    def _on_failure(self, error: Exception):
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()

            logger.warning(
                f"Circuit breaker '{self.service_name}': failure #{self._failure_count} - {str(error)[:100]}",
                extra={
                    "extra_data": {
                        "event": "circuit_breaker_failure",
                        "service": self.service_name,
                        "failure_count": self._failure_count,
                        "threshold": self.failure_threshold,
                        "state": self._state.value,
                    }
                },
            )

            if self._state == CircuitState.HALF_OPEN:
                self._transition_to(CircuitState.OPEN)
            elif self._failure_count >= self.failure_threshold:
                self._transition_to(CircuitState.OPEN)

    def _transition_to(self, new_state: CircuitState):
        """Must be called with lock held."""
        old_state = self._state
        self._state = new_state
        self._last_state_change = time.time()

        if new_state == CircuitState.CLOSED:
            self._failure_count = 0
            self._success_count = 0
        elif new_state == CircuitState.HALF_OPEN:
            self._success_count = 0

        logger.info(
            f"Circuit breaker '{self.service_name}': {old_state.value} → {new_state.value}",
            extra={
                "extra_data": {
                    "event": "circuit_breaker_transition",
                    "service": self.service_name,
                    "from_state": old_state.value,
                    "to_state": new_state.value,
                }
            },
        )

    def reset(self):
        """Manually reset the circuit breaker to closed state."""
        with self._lock:
            self._transition_to(CircuitState.CLOSED)
