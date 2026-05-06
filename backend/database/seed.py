"""Seed the database from models.json. Idempotent - can be run multiple times."""
import asyncio
import json
import sys
from pathlib import Path

# Allow running from backend/ directory
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import engine, async_session, init_db  # noqa: E402
from database.repository import ModelRepository  # noqa: E402


DATA_PATH = Path(__file__).parent.parent / "data" / "models.json"


async def seed():
    print("Initializing database tables...")
    await init_db()

    print(f"Loading seed data from {DATA_PATH}...")
    with open(DATA_PATH) as f:
        models_data = json.load(f)

    print(f"Found {len(models_data)} models to seed.")

    async with async_session() as session:
        repo = ModelRepository(session)
        count = await repo.bulk_upsert(models_data, created_by="seed_script")
        await session.commit()

    print(f"Successfully seeded {count} models.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
