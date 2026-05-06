import uuid
import time
from contextvars import ContextVar
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from middleware.logging_config import logger

# Context variable to hold correlation ID for the current request
correlation_id_var: ContextVar[str] = ContextVar("correlation_id", default="")

CORRELATION_HEADER = "X-Correlation-ID"


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Injects a correlation ID into every request for end-to-end traceability."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Use client-provided correlation ID or generate a new one
        correlation_id = request.headers.get(CORRELATION_HEADER, str(uuid.uuid4()))
        correlation_id_var.set(correlation_id)

        response = await call_next(request)
        response.headers[CORRELATION_HEADER] = correlation_id
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every request with method, path, status, and duration."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()
        correlation_id = correlation_id_var.get("")

        # Skip health checks from flooding logs
        if request.url.path == "/health":
            return await call_next(request)

        logger.info(
            f"Request started: {request.method} {request.url.path}",
            extra={
                "correlation_id": correlation_id,
                "extra_data": {
                    "http_method": request.method,
                    "path": request.url.path,
                    "query": str(request.query_params),
                    "client_ip": request.client.host if request.client else "unknown",
                    "event": "request_started",
                },
            },
        )

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"Request failed: {request.method} {request.url.path} - {str(exc)}",
                extra={
                    "correlation_id": correlation_id,
                    "extra_data": {
                        "http_method": request.method,
                        "path": request.url.path,
                        "duration_ms": round(duration_ms, 2),
                        "event": "request_failed",
                        "error": str(exc),
                    },
                },
            )
            raise

        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            f"Request completed: {request.method} {request.url.path} → {response.status_code} ({duration_ms:.1f}ms)",
            extra={
                "correlation_id": correlation_id,
                "extra_data": {
                    "http_method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "event": "request_completed",
                },
            },
        )

        return response
