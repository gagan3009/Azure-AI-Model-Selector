"""Initial schema - ai_models and audit_log tables

Revision ID: 001_initial
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON

# revision identifiers, used by Alembic.
revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_models",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("model_id", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("provider", sa.String(100), nullable=False, index=True),
        sa.Column("category", sa.String(50), nullable=False, index=True),
        sa.Column("context_window", sa.Integer, nullable=False, server_default="0"),
        sa.Column("max_output_tokens", sa.Integer, nullable=False, server_default="0"),
        sa.Column("pricing_tier", sa.String(20), nullable=False),
        sa.Column("estimated_cost_input", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("estimated_cost_output", sa.Float, nullable=False, server_default="0.0"),
        sa.Column("latency_tier", sa.String(20), nullable=False, server_default="'medium'"),
        sa.Column("throughput_tier", sa.String(20), nullable=False, server_default="'medium'"),
        sa.Column("supported_regions", JSON, nullable=False, server_default="'[]'"),
        sa.Column("capabilities", JSON, nullable=False, server_default="'[]'"),
        sa.Column("strengths", sa.Text, nullable=True),
        sa.Column("best_for", JSON, nullable=False, server_default="'[]'"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("version", sa.Integer, nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("created_by", sa.String(100), nullable=False, server_default="'system'"),
        sa.Column("updated_by", sa.String(100), nullable=False, server_default="'system'"),
    )

    op.create_table(
        "model_audit_log",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("model_id", sa.String(100), nullable=False, index=True),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("changes", JSON, nullable=True),
        sa.Column("performed_by", sa.String(100), nullable=False, server_default="'system'"),
        sa.Column("performed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("model_audit_log")
    op.drop_table("ai_models")
