"""Admin CRUD endpoints for AI model management (database-backed)."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession
from database.connection import get_db
from database.repository import ModelRepository


router = APIRouter()


class ModelCreateRequest(BaseModel):
    id: str
    name: str
    provider: str
    category: str
    context_window: int = 0
    max_output_tokens: int = 0
    pricing_tier: str
    estimated_cost_input: float = 0.0
    estimated_cost_output: float = 0.0
    latency_tier: str = "medium"
    throughput_tier: str = "medium"
    supported_regions: list[str] = []
    capabilities: list[str] = []
    strengths: str = ""
    best_for: list[str] = []


class ModelUpdateRequest(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    category: Optional[str] = None
    context_window: Optional[int] = None
    max_output_tokens: Optional[int] = None
    pricing_tier: Optional[str] = None
    estimated_cost_input: Optional[float] = None
    estimated_cost_output: Optional[float] = None
    latency_tier: Optional[str] = None
    throughput_tier: Optional[str] = None
    supported_regions: Optional[list[str]] = None
    capabilities: Optional[list[str]] = None
    strengths: Optional[str] = None
    best_for: Optional[list[str]] = None
    is_active: Optional[bool] = None


@router.get("/models")
async def list_all_models(
    category: Optional[str] = Query(None),
    provider: Optional[str] = Query(None),
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    repo = ModelRepository(db)
    models = await repo.get_all(
        category=category,
        provider=provider,
        active_only=not include_inactive,
    )
    return {
        "models": [m.to_detail_dict() for m in models],
        "count": len(models),
    }


@router.get("/models/{model_id}")
async def get_model(model_id: str, db: AsyncSession = Depends(get_db)):
    repo = ModelRepository(db)
    model = await repo.get_by_model_id(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model.to_detail_dict()


@router.post("/models", status_code=201)
async def create_model(req: ModelCreateRequest, db: AsyncSession = Depends(get_db)):
    repo = ModelRepository(db)
    existing = await repo.get_by_model_id(req.id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Model '{req.id}' already exists")
    model = await repo.create(req.model_dump(), created_by="admin")
    await db.commit()
    return model.to_detail_dict()


@router.put("/models/{model_id}")
async def update_model(model_id: str, req: ModelUpdateRequest, db: AsyncSession = Depends(get_db)):
    repo = ModelRepository(db)
    data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    model = await repo.update(model_id, data, updated_by="admin")
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    await db.commit()
    return model.to_detail_dict()


@router.delete("/models/{model_id}")
async def delete_model(model_id: str, db: AsyncSession = Depends(get_db)):
    repo = ModelRepository(db)
    success = await repo.soft_delete(model_id, deleted_by="admin")
    if not success:
        raise HTTPException(status_code=404, detail="Model not found")
    await db.commit()
    return {"message": f"Model '{model_id}' deactivated", "model_id": model_id}


@router.post("/models/{model_id}/restore")
async def restore_model(model_id: str, db: AsyncSession = Depends(get_db)):
    repo = ModelRepository(db)
    model = await repo.restore(model_id, restored_by="admin")
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    await db.commit()
    return model.to_detail_dict()


@router.get("/audit-log")
async def get_audit_log(
    model_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    repo = ModelRepository(db)
    logs = await repo.get_audit_log(model_id=model_id, limit=limit)
    return {
        "logs": [
            {
                "id": str(log.id),
                "model_id": log.model_id,
                "action": log.action,
                "changes": log.changes,
                "performed_by": log.performed_by,
                "performed_at": log.performed_at.isoformat(),
            }
            for log in logs
        ],
        "count": len(logs),
    }


@router.post("/seed")
async def seed_from_json(db: AsyncSession = Depends(get_db)):
    """Re-seed models from models.json. Idempotent."""
    import json
    from pathlib import Path

    data_path = Path(__file__).parent.parent / "data" / "models.json"
    with open(data_path) as f:
        models_data = json.load(f)

    repo = ModelRepository(db)
    count = await repo.bulk_upsert(models_data, created_by="seed_api")
    await db.commit()
    return {"message": f"Seeded {count} models", "count": count}
