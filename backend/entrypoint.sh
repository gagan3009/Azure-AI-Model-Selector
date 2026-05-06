#!/bin/sh
set -e

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    alembic upgrade head

    echo "Seeding database..."
    python -m database.seed
fi

echo "Starting server..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
