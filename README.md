# Azure AI Model Advisor

An enterprise-grade recommendation engine that helps teams select the right Azure AI model for their workloads. Features a weighted scoring algorithm, full CRUD governance, audit trails, circuit-breaker resilience, and a production-ready CI/CD pipeline.

![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![FastAPI](https://img.shields.io/badge/fastapi-0.115+-green.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)
![Docker](https://img.shields.io/badge/docker-compose-blue.svg)
![CI](https://img.shields.io/badge/CI-GitHub%20Actions-black.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

### Core Capabilities

- **Smart Recommendations** — Weighted scoring across task type (40%), budget (25%), performance (20%), context window (10%), and region (5%).
- **Pre-built Use Cases** — Enterprise Chatbot, RAG/Search, Code Assistant, Document Processing, Content Generation, Multilingual, Image Analysis, Voice Assistant.
- **Model Catalog** — Browse 20+ Azure AI models with filtering by category, provider, and region.
- **Side-by-Side Comparison** — Compare up to 4 models on capabilities, pricing, and performance with interactive charts.
- **Cost Calculator** — Estimate monthly and annual costs based on projected token usage.
- **Token Counter** — Paste text to estimate token counts per model.
- **Code Snippet Generator** — Ready-to-use Python, JavaScript, C#, and cURL snippets for any model.
- **Live Azure Integration** — Optionally connect to your subscription to validate deployed models.

### Production-Grade Infrastructure

- **PostgreSQL Database** — Full CRUD with async SQLAlchemy, Alembic migrations, and seed scripts.
- **Model Governance Dashboard** — Create, edit, deactivate/restore models with version tracking and audit trails.
- **Structured Logging** — JSON-formatted logs with correlation IDs for request tracing.
- **Circuit Breaker** — Automatic failure isolation for Azure API calls (closed → open → half-open).
- **Response Caching** — TTL-based in-memory cache with LRU eviction across 4 cache tiers.
- **Health Checks** — Liveness (`/health`) and deep readiness (`/health/detailed`) probes for Kubernetes/App Service.
- **CI/CD Pipeline** — GitHub Actions with lint, test, build, and deploy stages.
- **Dark/Light Theme** — Persistent user preference with full UI adaptation.

## Architecture

```
┌─────────────────┐       ┌───────────────────────────────┐       ┌────────────────┐
│   React SPA     │──────▶│  FastAPI Backend               │──────▶│  PostgreSQL 16 │
│   Vite + Nginx  │  /api │                               │       │  (ai_models,   │
│   Port 3000     │       │  ┌─────────────────────────┐  │       │  audit_log)    │
└─────────────────┘       │  │ Middleware Stack         │  │       └────────────────┘
                          │  │ • CORS                   │  │
                          │  │ • Correlation IDs        │  │       ┌────────────────┐
                          │  │ • Request Logging        │  │──────▶│  Azure AI      │
                          │  └─────────────────────────┘  │       │  (optional)    │
                          │                               │       └────────────────┘
                          │  ┌─────────────────────────┐  │
                          │  │ Services                 │  │
                          │  │ • Model Selector         │  │
                          │  │ • Circuit Breaker        │  │
                          │  │ • TTL Cache              │  │
                          │  │ • Health Checks          │  │
                          │  └─────────────────────────┘  │
                          │  Port 8000                     │
                          └───────────────────────────────┘
```

| Layer      | Stack                                                      |
|------------|-------------------------------------------------------------|
| Frontend   | React 18, Vite 5, Recharts, CSS Variables                   |
| Backend    | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2 (async)    |
| Database   | PostgreSQL 16, Alembic migrations, asyncpg driver           |
| Infra      | Docker Compose, Nginx, GitHub Actions CI/CD                 |
| Azure      | azure-identity, azure-mgmt-cognitiveservices SDK            |

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose **or**
- Python 3.11+, Node.js 18+, and PostgreSQL 16 (optional)

### Quick Start (Docker — Full Stack with Database)

```bash
# Clone the repository
git clone https://github.com/gagan3009/Azure-AI-Model-Selector.git
cd Azure-AI-Model-Selector

# (Optional) Configure Azure live integration
cp backend/.env.example .env
# Edit .env and add your AZURE_SUBSCRIPTION_ID

# Start all services (backend + frontend + PostgreSQL)
docker compose up --build
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs (Swagger):** http://localhost:8000/docs
- **Database:** localhost:5432 (postgres/postgres)

On first start, the entrypoint automatically runs migrations and seeds the database.

### Local Development (No Docker)

**Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Without `DATABASE_URL`, the backend runs in file-based mode using `data/models.json` (no PostgreSQL needed).

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at http://localhost:5173 with hot reload and API proxy to port 8000.

### Running with PostgreSQL Locally

```bash
# Start PostgreSQL (or use an existing instance)
docker run -d --name pg -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aimodels postgres:16-alpine

# Set the connection string
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/aimodels

# Run migrations and seed
cd backend
python -m database.seed

# Start the server
uvicorn main:app --reload --port 8000
```

## API Reference

### Public Endpoints

| Method | Endpoint                     | Description                              |
|--------|------------------------------|------------------------------------------|
| GET    | `/health`                    | Liveness probe (lightweight)             |
| GET    | `/health/detailed`           | Readiness probe (checks all subsystems)  |
| GET    | `/api/models`                | List models (filter: category, provider, region) |
| GET    | `/api/models/{model_id}`     | Get a single model                       |
| POST   | `/api/models/recommend`      | Get ranked recommendations               |
| POST   | `/api/models/cost-estimate`  | Estimate monthly/annual costs            |
| GET    | `/api/filters`               | Get available filter options             |
| GET    | `/api/azure/status`          | Azure connection + circuit breaker status |
| GET    | `/api/azure/deployments`     | List live Azure deployments              |
| GET    | `/api/azure/validate/{id}`   | Check model availability in a region     |
| GET    | `/api/cache/stats`           | Cache hit/miss statistics                |
| POST   | `/api/cache/clear`           | Clear all caches                         |

### Admin Endpoints (Database Required)

| Method | Endpoint                            | Description                    |
|--------|-------------------------------------|--------------------------------|
| GET    | `/api/admin/models`                 | List all models (inc. inactive)|
| GET    | `/api/admin/models/{model_id}`      | Get model with governance data |
| POST   | `/api/admin/models`                 | Create a new model             |
| PUT    | `/api/admin/models/{model_id}`      | Update model fields            |
| DELETE | `/api/admin/models/{model_id}`      | Soft-delete (deactivate)       |
| POST   | `/api/admin/models/{model_id}/restore` | Restore a deactivated model |
| GET    | `/api/admin/audit-log`              | View audit trail               |
| POST   | `/api/admin/seed`                   | Seed DB from models.json       |

### Recommendation Request

```json
{
  "task_type": "chat",
  "budget": "medium",
  "performance_priority": "latency",
  "context_window": "large",
  "regions": ["eastus", "westeurope"],
  "use_case": "enterprise_chatbot"
}
```

| Field                  | Values                                                                          |
|------------------------|---------------------------------------------------------------------------------|
| `task_type`            | `chat`, `code`, `embedding`, `image`, `vision`, `speech`, `document`, `translation` |
| `budget`               | `low`, `medium`, `high`, `premium`                                              |
| `performance_priority` | `latency`, `throughput`, `balanced`                                             |
| `context_window`       | `small`, `medium`, `large`, `very_large`                                        |
| `regions`              | Optional list of Azure regions                                                  |
| `use_case`             | Optional pre-built scenario ID                                                  |

## Environment Variables

| Variable               | Required | Description                                                  |
|------------------------|----------|--------------------------------------------------------------|
| `DATABASE_URL`         | No       | PostgreSQL connection string. Enables DB mode with CRUD/governance. Without it, uses `models.json`. |
| `AZURE_SUBSCRIPTION_ID`| No      | Enables live Azure model discovery and validation.           |

## Project Structure

```
├── docker-compose.yml              # Full stack: backend + frontend + PostgreSQL
├── .github/workflows/ci.yml        # CI/CD pipeline (lint → test → build → deploy)
├── backend/
│   ├── main.py                     # FastAPI app with lifespan, middleware, health checks
│   ├── requirements.txt            # Python dependencies
│   ├── pyproject.toml              # Ruff + pytest configuration
│   ├── Dockerfile                  # Multi-stage production image
│   ├── entrypoint.sh              # Migrations + seed on startup
│   ├── alembic.ini                # Alembic migration config
│   ├── alembic/
│   │   ├── env.py                 # Async migration environment
│   │   └── versions/
│   │       └── 001_initial.py     # Initial schema migration
│   ├── data/
│   │   └── models.json            # Static model catalog (20+ models)
│   ├── database/
│   │   ├── connection.py          # Async SQLAlchemy engine + session
│   │   ├── db_models.py           # ORM: AIModel + ModelAuditLog
│   │   ├── repository.py          # CRUD, soft-delete, audit, bulk upsert
│   │   └── seed.py                # CLI seed script
│   ├── middleware/
│   │   ├── logging_config.py      # Structured JSON logging
│   │   └── request_middleware.py  # Correlation IDs + request logging
│   ├── models/
│   │   └── schemas.py             # Pydantic v2 request/response schemas
│   ├── routers/
│   │   ├── models.py              # Public API endpoints
│   │   └── admin.py               # Admin CRUD + audit log endpoints
│   ├── services/
│   │   ├── azure_client.py        # Azure SDK with circuit breaker
│   │   ├── cache.py               # TTL-based LRU cache (4 tiers)
│   │   ├── circuit_breaker.py     # Circuit breaker pattern
│   │   ├── health_service.py      # Deep health checks (DB, filesystem, Azure)
│   │   └── model_selector.py      # Recommendation scoring engine
│   └── tests/
│       ├── test_api.py            # 24 tests: health, catalog, recommendations, cache
│       └── test_admin.py          # 11 tests: CRUD, audit, seed (async SQLite)
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js              # Dev proxy to backend
    ├── Dockerfile                  # Node build + Nginx serve
    ├── nginx.conf                  # Reverse proxy config
    ├── .eslintrc.json              # ESLint config
    └── src/
        ├── App.jsx                 # Main app with 7 tabs
        ├── index.css               # Full design system (CSS variables)
        ├── components/
        │   ├── SelectionForm.jsx       # Requirement input form
        │   ├── ModelResults.jsx        # Recommendation results with charts
        │   ├── ModelCatalog.jsx        # Browsable model catalog
        │   ├── ModelComparison.jsx     # Side-by-side comparison
        │   ├── CostCalculator.jsx      # Token cost estimation
        │   ├── TokenCounter.jsx        # Text → token count
        │   ├── CodeSnippetGenerator.jsx # Multi-language code gen
        │   └── GovernanceDashboard.jsx # Model CRUD + audit log UI
        └── services/
            └── api.js              # API client (public + admin)
```

## Testing

```bash
cd backend

# Run all tests (35 tests)
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ --cov=. --cov-report=term-missing

# Run only admin/DB tests
python -m pytest tests/test_admin.py -v
```

## Linting

```bash
# Backend (ruff)
cd backend && ruff check .

# Frontend (eslint)
cd frontend && npm run lint
```

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. **Lint** — `ruff check` (backend) + `eslint` (frontend) in parallel
2. **Test** — `pytest` with coverage reporting
3. **Build** — Docker images with BuildKit + GitHub Actions cache
4. **Deploy** — Azure Container Apps (requires repository secrets)

### Required Secrets for Deployment

| Secret                 | Description                          |
|------------------------|--------------------------------------|
| `AZURE_CREDENTIALS`   | Azure service principal JSON         |
| `ACR_LOGIN_SERVER`     | Azure Container Registry URL         |
| `ACR_USERNAME`         | ACR username                         |
| `ACR_PASSWORD`         | ACR password                         |
| `AZURE_RESOURCE_GROUP` | Target resource group                |
| `BACKEND_URL`          | Deployed backend URL for frontend    |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure tests pass (`pytest`) and lint is clean (`ruff check .`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License.
