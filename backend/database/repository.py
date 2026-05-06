from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from database.db_models import AIModel, ModelAuditLog


class ModelRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all(
        self,
        category: Optional[str] = None,
        provider: Optional[str] = None,
        region: Optional[str] = None,
        active_only: bool = True,
    ) -> list[AIModel]:
        stmt = select(AIModel)
        if active_only:
            stmt = stmt.where(AIModel.is_active == True)  # noqa: E712
        if category:
            stmt = stmt.where(AIModel.category == category)
        if provider:
            stmt = stmt.where(AIModel.provider.ilike(f"%{provider}%"))
        if region:
            stmt = stmt.where(AIModel.supported_regions.contains([region]))
        stmt = stmt.order_by(AIModel.name)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_model_id(self, model_id: str) -> Optional[AIModel]:
        stmt = select(AIModel).where(AIModel.model_id == model_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, data: dict, created_by: str = "system") -> AIModel:
        model = AIModel(
            model_id=data["id"],
            name=data["name"],
            provider=data["provider"],
            category=data["category"],
            context_window=data.get("context_window", 0),
            max_output_tokens=data.get("max_output_tokens", 0),
            pricing_tier=data["pricing_tier"],
            estimated_cost_input=data.get("estimated_cost_input", 0.0),
            estimated_cost_output=data.get("estimated_cost_output", 0.0),
            latency_tier=data.get("latency_tier", "medium"),
            throughput_tier=data.get("throughput_tier", "medium"),
            supported_regions=data.get("supported_regions", []),
            capabilities=data.get("capabilities", []),
            strengths=data.get("strengths", ""),
            best_for=data.get("best_for", []),
            created_by=created_by,
            updated_by=created_by,
        )
        self.session.add(model)
        await self.session.flush()
        await self._log_audit(model.model_id, "created", None, created_by)
        return model

    async def update(self, model_id: str, data: dict, updated_by: str = "system") -> Optional[AIModel]:
        model = await self.get_by_model_id(model_id)
        if not model:
            return None

        changes = {}
        updatable_fields = [
            "name", "provider", "category", "context_window", "max_output_tokens",
            "pricing_tier", "estimated_cost_input", "estimated_cost_output",
            "latency_tier", "throughput_tier", "supported_regions", "capabilities",
            "strengths", "best_for", "is_active",
        ]
        for field in updatable_fields:
            if field in data and getattr(model, field) != data[field]:
                changes[field] = {"old": getattr(model, field), "new": data[field]}
                setattr(model, field, data[field])

        if changes:
            model.version += 1
            model.updated_at = datetime.now(timezone.utc)
            model.updated_by = updated_by
            await self.session.flush()
            await self._log_audit(model_id, "updated", changes, updated_by)

        return model

    async def soft_delete(self, model_id: str, deleted_by: str = "system") -> bool:
        model = await self.get_by_model_id(model_id)
        if not model:
            return False
        model.is_active = False
        model.version += 1
        model.updated_at = datetime.now(timezone.utc)
        model.updated_by = deleted_by
        await self.session.flush()
        await self._log_audit(model_id, "deleted", None, deleted_by)
        return True

    async def restore(self, model_id: str, restored_by: str = "system") -> Optional[AIModel]:
        model = await self.get_by_model_id(model_id)
        if not model:
            return None
        model.is_active = True
        model.version += 1
        model.updated_at = datetime.now(timezone.utc)
        model.updated_by = restored_by
        await self.session.flush()
        await self._log_audit(model_id, "restored", None, restored_by)
        return model

    async def get_audit_log(self, model_id: Optional[str] = None, limit: int = 50) -> list[ModelAuditLog]:
        stmt = select(ModelAuditLog).order_by(ModelAuditLog.performed_at.desc()).limit(limit)
        if model_id:
            stmt = stmt.where(ModelAuditLog.model_id == model_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count(self, active_only: bool = True) -> int:
        stmt = select(func.count(AIModel.id))
        if active_only:
            stmt = stmt.where(AIModel.is_active == True)  # noqa: E712
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def _log_audit(self, model_id: str, action: str, changes: Optional[dict], performed_by: str):
        log = ModelAuditLog(
            model_id=model_id,
            action=action,
            changes=changes,
            performed_by=performed_by,
        )
        self.session.add(log)

    async def bulk_upsert(self, models_data: list[dict], created_by: str = "system") -> int:
        """Insert or update models from a list of dicts (seed data format)."""
        count = 0
        for data in models_data:
            existing = await self.get_by_model_id(data["id"])
            if existing:
                await self.update(data["id"], data, updated_by=created_by)
            else:
                await self.create(data, created_by=created_by)
            count += 1
        return count
