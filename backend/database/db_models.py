import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, Float, Boolean, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from database.connection import Base


class AIModel(Base):
    __tablename__ = "ai_models"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    context_window: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    max_output_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pricing_tier: Mapped[str] = mapped_column(String(20), nullable=False)
    estimated_cost_input: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    estimated_cost_output: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    latency_tier: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    throughput_tier: Mapped[str] = mapped_column(String(20), nullable=False, default="medium")
    supported_regions: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    capabilities: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    strengths: Mapped[str] = mapped_column(Text, nullable=True)
    best_for: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Governance / audit fields
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    created_by: Mapped[str] = mapped_column(String(100), nullable=False, default="system")
    updated_by: Mapped[str] = mapped_column(String(100), nullable=False, default="system")

    def to_dict(self):
        return {
            "id": self.model_id,
            "name": self.name,
            "provider": self.provider,
            "category": self.category,
            "context_window": self.context_window,
            "max_output_tokens": self.max_output_tokens,
            "pricing_tier": self.pricing_tier,
            "estimated_cost_input": self.estimated_cost_input,
            "estimated_cost_output": self.estimated_cost_output,
            "latency_tier": self.latency_tier,
            "throughput_tier": self.throughput_tier,
            "supported_regions": self.supported_regions,
            "capabilities": self.capabilities,
            "strengths": self.strengths,
            "best_for": self.best_for,
        }

    def to_detail_dict(self):
        """Full detail including governance fields."""
        d = self.to_dict()
        d.update({
            "is_active": self.is_active,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by": self.created_by,
            "updated_by": self.updated_by,
        })
        return d


class ModelAuditLog(Base):
    __tablename__ = "model_audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # created, updated, deleted, restored
    changes: Mapped[dict] = mapped_column(JSON, nullable=True)
    performed_by: Mapped[str] = mapped_column(String(100), nullable=False, default="system")
    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
