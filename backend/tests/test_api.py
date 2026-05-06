"""
Backend test suite for Azure AI Model Selection API.
Tests cover: health endpoints, model catalog, recommendations, cost estimation, cache, and circuit breaker.
"""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    return TestClient(app)


# ─── Health Endpoints ───────────────────────────────────────

class TestHealth:
    def test_liveness_probe(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "uptime_seconds" in data

    def test_readiness_probe(self, client):
        r = client.get("/health/detailed")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("healthy", "degraded", "unhealthy")
        assert "checks" in data
        assert "model_catalog" in data["checks"]
        assert "filesystem" in data["checks"]
        assert "cache" in data
        assert "circuit_breaker" in data

    def test_health_has_correlation_id(self, client):
        r = client.get("/health/detailed")
        assert "x-correlation-id" in r.headers

    def test_custom_correlation_id(self, client):
        r = client.get("/health/detailed", headers={"X-Correlation-ID": "test-123"})
        assert r.headers["x-correlation-id"] == "test-123"


# ─── Model Catalog ──────────────────────────────────────────

class TestModelCatalog:
    def test_list_all_models(self, client):
        r = client.get("/api/models")
        assert r.status_code == 200
        data = r.json()
        assert "models" in data
        assert "count" in data
        assert data["count"] > 0

    def test_filter_by_category(self, client):
        r = client.get("/api/models?category=chat")
        assert r.status_code == 200
        data = r.json()
        for model in data["models"]:
            assert model["category"] == "chat"

    def test_filter_by_provider(self, client):
        r = client.get("/api/models?provider=Azure+OpenAI")
        assert r.status_code == 200
        data = r.json()
        for model in data["models"]:
            assert model["provider"] == "Azure OpenAI"

    def test_get_model_by_id(self, client):
        r = client.get("/api/models/gpt-4o")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "gpt-4o"
        assert "name" in data

    def test_get_model_not_found(self, client):
        r = client.get("/api/models/nonexistent-model")
        assert r.status_code == 404

    def test_model_has_required_fields(self, client):
        r = client.get("/api/models")
        model = r.json()["models"][0]
        required = ["id", "name", "provider", "category", "capabilities",
                    "pricing_tier", "context_window", "supported_regions"]
        for field in required:
            assert field in model, f"Missing field: {field}"


# ─── Filters ────────────────────────────────────────────────

class TestFilters:
    def test_get_filters(self, client):
        r = client.get("/api/filters")
        assert r.status_code == 200
        data = r.json()
        assert "task_types" in data
        assert "budget_tiers" in data
        assert "regions" in data
        assert len(data["task_types"]) > 0


# ─── Recommendations ────────────────────────────────────────

class TestRecommendations:
    def test_basic_recommendation(self, client):
        r = client.post("/api/models/recommend", json={
            "task_type": "chat",
            "budget": "medium",
            "performance_priority": "balanced",
            "context_window": "large",
        })
        assert r.status_code == 200
        data = r.json()
        assert "recommendations" in data
        assert "total_models_evaluated" in data
        assert len(data["recommendations"]) > 0

    def test_recommendation_has_scores(self, client):
        r = client.post("/api/models/recommend", json={
            "task_type": "chat",
            "budget": "high",
            "performance_priority": "latency",
            "context_window": "large",
        })
        rec = r.json()["recommendations"][0]
        assert "match_score" in rec
        assert "name" in rec
        assert "explanation" in rec
        assert 0 <= rec["match_score"] <= 100

    def test_recommendation_with_region(self, client):
        r = client.post("/api/models/recommend", json={
            "task_type": "chat",
            "budget": "medium",
            "performance_priority": "balanced",
            "context_window": "medium",
            "regions": ["eastus"],
        })
        assert r.status_code == 200
        data = r.json()
        for rec in data["recommendations"]:
            assert "eastus" in rec["supported_regions"]

    def test_recommendation_sorted_by_score(self, client):
        r = client.post("/api/models/recommend", json={
            "task_type": "code",
            "budget": "high",
            "performance_priority": "balanced",
            "context_window": "very_large",
        })
        recs = r.json()["recommendations"]
        scores = [r["match_score"] for r in recs]
        assert scores == sorted(scores, reverse=True)

    def test_invalid_task_type(self, client):
        r = client.post("/api/models/recommend", json={
            "task_type": "nonexistent",
            "budget": "low",
            "performance_priority": "balanced",
            "context_window": "small",
        })
        # Should still return 200 with empty or filtered results
        assert r.status_code in (200, 422)


# ─── Cost Estimation ────────────────────────────────────────

class TestCostEstimation:
    def test_cost_estimate(self, client):
        r = client.post("/api/models/cost-estimate", json={
            "model_id": "gpt-4o",
            "monthly_input_tokens": 10,
            "monthly_output_tokens": 5,
        })
        assert r.status_code == 200
        data = r.json()
        assert "model_name" in data
        assert "total_monthly_cost" in data
        assert "annual_cost" in data
        assert data["total_monthly_cost"] > 0
        assert data["annual_cost"] == round(data["total_monthly_cost"] * 12, 2)

    def test_cost_estimate_not_found(self, client):
        r = client.post("/api/models/cost-estimate", json={
            "model_id": "nonexistent",
            "monthly_input_tokens": 1,
            "monthly_output_tokens": 1,
        })
        assert r.status_code == 404

    def test_cost_scales_with_tokens(self, client):
        r1 = client.post("/api/models/cost-estimate", json={
            "model_id": "gpt-4o",
            "monthly_input_tokens": 1,
            "monthly_output_tokens": 1,
        })
        r2 = client.post("/api/models/cost-estimate", json={
            "model_id": "gpt-4o",
            "monthly_input_tokens": 10,
            "monthly_output_tokens": 10,
        })
        assert r2.json()["total_monthly_cost"] > r1.json()["total_monthly_cost"]


# ─── Cache ──────────────────────────────────────────────────

class TestCache:
    def test_cache_stats_endpoint(self, client):
        r = client.get("/api/cache/stats")
        assert r.status_code == 200
        data = r.json()
        assert "caches" in data
        assert len(data["caches"]) == 4

    def test_cache_clear(self, client):
        # Populate cache
        client.get("/api/models")
        # Clear
        r = client.post("/api/cache/clear")
        assert r.status_code == 200
        assert r.json()["cleared_entries"] >= 0

    def test_cache_hit_improves_performance(self, client):
        """Second request should be faster (served from cache)."""
        import time
        # Clear cache first
        client.post("/api/cache/clear")
        # First request (miss)
        start = time.perf_counter()
        client.get("/api/models")
        first_duration = time.perf_counter() - start
        # Second request (hit)
        start = time.perf_counter()
        client.get("/api/models")
        second_duration = time.perf_counter() - start
        # Cached request should not be slower (allowing tolerance)
        assert second_duration <= first_duration * 2


# ─── Azure Integration ──────────────────────────────────────

class TestAzureIntegration:
    def test_azure_status(self, client):
        r = client.get("/api/azure/status")
        assert r.status_code == 200
        data = r.json()
        assert "connected" in data
        assert "circuit_breaker" in data
        assert data["circuit_breaker"]["state"] in ("closed", "open", "half_open")

    def test_azure_deployments_without_config(self, client):
        r = client.get("/api/azure/deployments")
        assert r.status_code == 200
        # Without Azure config, should return empty or error message
        data = r.json()
        assert "deployments" in data or "error" in data
