import os
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import models
from routers import admin
from middleware.logging_config import logger
from middleware.request_middleware import CorrelationIDMiddleware, RequestLoggingMiddleware
from services.health_service import run_health_checks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup if DATABASE_URL is set."""
    if os.getenv("DATABASE_URL"):
        from database.connection import init_db
        logger.info("Initializing database...", extra={"extra_data": {"event": "db_init"}})
        await init_db()
    yield


app = FastAPI(
    title="Azure AI Model Selection API",
    description="API to recommend the best Azure AI model based on requirements",
    version="3.0.0",
    lifespan=lifespan,
)

# Middleware order matters: outermost first
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(CorrelationIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Correlation-ID"],
)

app.include_router(models.router, prefix="/api")
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

_start_time = time.time()

logger.info("Application started", extra={
    "extra_data": {"event": "app_startup", "version": "3.0.0"}
})


@app.get("/health")
def health_check():
    """Quick liveness probe — lightweight, no dependency checks."""
    return {
        "status": "healthy",
        "version": "3.0.0",
        "uptime_seconds": round(time.time() - _start_time, 1),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/health/detailed")
def health_check_detailed():
    """
    Deep readiness probe — checks all dependencies.

    Use for:
    - Kubernetes readiness probes
    - Azure App Service health checks
    - Monitoring dashboards
    - Ops troubleshooting

    Returns 200 with status field indicating healthy/degraded/unhealthy.
    """
    return run_health_checks(_start_time)
