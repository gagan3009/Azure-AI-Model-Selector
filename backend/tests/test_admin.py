"""
Tests for admin CRUD endpoints using an in-memory SQLite database.
These tests validate the database-backed model management functionality.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from database.connection import Base, get_db
from main import app


# Use SQLite for testing (no PostgreSQL required)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


SAMPLE_MODEL = {
    "id": "test-model-1",
    "name": "Test Model 1",
    "provider": "Test Provider",
    "category": "chat",
    "context_window": 32000,
    "max_output_tokens": 4096,
    "pricing_tier": "medium",
    "estimated_cost_input": 1.5,
    "estimated_cost_output": 3.0,
    "latency_tier": "low",
    "throughput_tier": "high",
    "supported_regions": ["eastus", "westeurope"],
    "capabilities": ["chat", "completion"],
    "strengths": "Good for testing",
    "best_for": ["testing", "unit tests"],
}


class TestAdminCRUD:
    @pytest.mark.anyio
    async def test_create_model(self, client):
        r = await client.post("/api/admin/models", json=SAMPLE_MODEL)
        assert r.status_code == 201
        data = r.json()
        assert data["id"] == "test-model-1"
        assert data["name"] == "Test Model 1"
        assert data["version"] == 1
        assert data["is_active"] is True
        assert data["created_by"] == "admin"

    @pytest.mark.anyio
    async def test_create_duplicate_model(self, client):
        await client.post("/api/admin/models", json=SAMPLE_MODEL)
        r = await client.post("/api/admin/models", json=SAMPLE_MODEL)
        assert r.status_code == 409

    @pytest.mark.anyio
    async def test_list_models(self, client):
        await client.post("/api/admin/models", json=SAMPLE_MODEL)
        r = await client.get("/api/admin/models")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] == 1
        assert data["models"][0]["id"] == "test-model-1"

    @pytest.mark.anyio
    async def test_get_model(self, client):
        await client.post("/api/admin/models", json=SAMPLE_MODEL)
        r = await client.get("/api/admin/models/test-model-1")
        assert r.status_code == 200
        assert r.json()["name"] == "Test Model 1"

    @pytest.mark.anyio
    async def test_get_model_not_found(self, client):
        r = await client.get("/api/admin/models/nonexistent")
        assert r.status_code == 404

    @pytest.mark.anyio
    async def test_update_model(self, client):
        await client.post("/api/admin/models", json=SAMPLE_MODEL)
        r = await client.put("/api/admin/models/test-model-1", json={"name": "Updated Name", "pricing_tier": "high"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Updated Name"
        assert data["pricing_tier"] == "high"
        assert data["version"] == 2

    @pytest.mark.anyio
    async def test_update_model_no_fields(self, client):
        await client.post("/api/admin/models", json=SAMPLE_MODEL)
        r = await client.put("/api/admin/models/test-model-1", json={})
        assert r.status_code == 400

    @pytest.mark.anyio
    async def test_delete_model(self, client):
        await client.post("/api/admin/models", json=SAMPLE_MODEL)
        r = await client.delete("/api/admin/models/test-model-1")
        assert r.status_code == 200
        assert "deactivated" in r.json()["message"]

        # Model should not appear in active list
        r = await client.get("/api/admin/models")
        assert r.json()["count"] == 0

        # But should appear with include_inactive
        r = await client.get("/api/admin/models?include_inactive=true")
        assert r.json()["count"] == 1

    @pytest.mark.anyio
    async def test_restore_model(self, client):
        await client.post("/api/admin/models", json=SAMPLE_MODEL)
        await client.delete("/api/admin/models/test-model-1")
        r = await client.post("/api/admin/models/test-model-1/restore")
        assert r.status_code == 200
        assert r.json()["is_active"] is True

    @pytest.mark.anyio
    async def test_audit_log(self, client):
        await client.post("/api/admin/models", json=SAMPLE_MODEL)
        await client.put("/api/admin/models/test-model-1", json={"name": "Changed"})
        r = await client.get("/api/admin/audit-log?model_id=test-model-1")
        assert r.status_code == 200
        logs = r.json()["logs"]
        assert len(logs) >= 2
        actions = [log["action"] for log in logs]
        assert "created" in actions
        assert "updated" in actions

    @pytest.mark.anyio
    async def test_seed_from_json(self, client):
        r = await client.post("/api/admin/seed")
        assert r.status_code == 200
        data = r.json()
        assert data["count"] > 0

        # Verify models were seeded
        r = await client.get("/api/admin/models")
        assert r.json()["count"] > 0
