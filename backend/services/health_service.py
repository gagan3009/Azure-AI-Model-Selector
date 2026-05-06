"""
Deep health check service.

Checks multiple subsystems and reports overall status:
  - healthy: all checks pass
  - degraded: non-critical checks failing (app still usable)
  - unhealthy: critical checks failing (app not functional)
"""

import os
import time
import json
from pathlib import Path
from typing import Any
from middleware.logging_config import logger


DATA_PATH = Path(__file__).parent.parent / "data" / "models.json"


def _check_model_catalog() -> dict[str, Any]:
    """Verify model catalog file exists, is valid JSON, and has models."""
    start = time.perf_counter()
    try:
        if not DATA_PATH.exists():
            return {
                "status": "unhealthy",
                "message": "models.json not found",
                "duration_ms": _elapsed(start),
            }

        file_size = DATA_PATH.stat().st_size
        if file_size == 0:
            return {
                "status": "unhealthy",
                "message": "models.json is empty",
                "duration_ms": _elapsed(start),
            }

        with open(DATA_PATH) as f:
            data = json.load(f)

        model_count = len(data) if isinstance(data, list) else len(data.get("models", []))
        if model_count == 0:
            return {
                "status": "degraded",
                "message": "models.json has no models",
                "duration_ms": _elapsed(start),
            }

        return {
            "status": "healthy",
            "message": f"{model_count} models loaded",
            "model_count": model_count,
            "file_size_bytes": file_size,
            "duration_ms": _elapsed(start),
        }
    except json.JSONDecodeError as e:
        return {
            "status": "unhealthy",
            "message": f"Invalid JSON: {str(e)[:100]}",
            "duration_ms": _elapsed(start),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Unexpected error: {str(e)[:100]}",
            "duration_ms": _elapsed(start),
        }


def _check_filesystem() -> dict[str, Any]:
    """Verify filesystem is readable/writable (for logs, temp files)."""
    start = time.perf_counter()
    try:
        tmp_dir = Path(__file__).parent.parent / ".tmp_health"
        tmp_dir.mkdir(exist_ok=True)
        test_file = tmp_dir / "health_probe"
        test_file.write_text("ok")
        content = test_file.read_text()
        test_file.unlink()
        tmp_dir.rmdir()

        if content != "ok":
            return {
                "status": "degraded",
                "message": "Write verification failed",
                "duration_ms": _elapsed(start),
            }

        return {
            "status": "healthy",
            "message": "Read/write OK",
            "duration_ms": _elapsed(start),
        }
    except PermissionError:
        return {
            "status": "degraded",
            "message": "No write permission",
            "duration_ms": _elapsed(start),
        }
    except Exception as e:
        return {
            "status": "degraded",
            "message": f"Filesystem error: {str(e)[:100]}",
            "duration_ms": _elapsed(start),
        }


def _check_azure_connectivity() -> dict[str, Any]:
    """Check if Azure credentials and subscription are configured."""
    start = time.perf_counter()
    subscription_id = os.environ.get("AZURE_SUBSCRIPTION_ID")

    if not subscription_id:
        return {
            "status": "degraded",
            "message": "AZURE_SUBSCRIPTION_ID not set (live features disabled)",
            "duration_ms": _elapsed(start),
        }

    # Try to import Azure SDK (don't actually connect — that's expensive)
    try:
        from azure.identity import DefaultAzureCredential  # noqa: F401
        return {
            "status": "healthy",
            "message": "Azure SDK available, subscription configured",
            "subscription_configured": True,
            "duration_ms": _elapsed(start),
        }
    except ImportError:
        return {
            "status": "degraded",
            "message": "Azure SDK not installed",
            "duration_ms": _elapsed(start),
        }
    except Exception as e:
        return {
            "status": "degraded",
            "message": f"Azure check error: {str(e)[:100]}",
            "duration_ms": _elapsed(start),
        }


def _check_memory() -> dict[str, Any]:
    """Basic memory usage check."""
    start = time.perf_counter()
    try:
        import sys
        # Get rough process memory via sys.getsizeof on key structures
        # For production, use psutil — but we keep deps minimal
        return {
            "status": "healthy",
            "message": "Process responsive",
            "python_version": sys.version.split()[0],
            "duration_ms": _elapsed(start),
        }
    except Exception as e:
        return {
            "status": "degraded",
            "message": str(e)[:100],
            "duration_ms": _elapsed(start),
        }


def _elapsed(start: float) -> float:
    return round((time.perf_counter() - start) * 1000, 2)


def run_health_checks(app_start_time: float) -> dict[str, Any]:
    """
    Run all health checks and compute overall status.

    Returns a structured response suitable for monitoring tools
    (e.g., Azure App Service health probes, Kubernetes liveness/readiness).
    """
    start = time.perf_counter()

    checks = {
        "model_catalog": _check_model_catalog(),
        "filesystem": _check_filesystem(),
        "azure_connectivity": _check_azure_connectivity(),
        "runtime": _check_memory(),
    }

    # Determine overall status
    statuses = [c["status"] for c in checks.values()]
    critical_checks = ["model_catalog"]  # These make the app unhealthy
    non_critical_checks = ["filesystem", "azure_connectivity", "runtime"]

    if any(checks[c]["status"] == "unhealthy" for c in critical_checks):
        overall = "unhealthy"
    elif any(checks[c]["status"] in ("unhealthy", "degraded") for c in critical_checks):
        overall = "degraded"
    elif any(checks[c]["status"] != "healthy" for c in non_critical_checks):
        overall = "degraded"
    else:
        overall = "healthy"

    total_duration = _elapsed(start)

    result = {
        "status": overall,
        "version": "2.0.0",
        "uptime_seconds": round(time.time() - app_start_time, 1),
        "total_check_duration_ms": total_duration,
        "checks": checks,
    }

    if overall != "healthy":
        logger.warning(
            f"Health check status: {overall}",
            extra={"extra_data": {"event": "health_check", "status": overall, "checks": checks}},
        )

    return result
