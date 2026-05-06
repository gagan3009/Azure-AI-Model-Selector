# Azure AI Model Selector

An intelligent recommendation engine that helps you choose the right Azure AI model for your workload. It evaluates models across dimensions like task type, budget, latency, throughput, and context window size — and provides ranked recommendations with cost estimates.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![Docker](https://img.shields.io/badge/docker-compose-blue.svg)

## Features

- **Smart Recommendations** — Weighted scoring algorithm matches models to your requirements across task type, budget, performance priority, and context window needs.
- **Pre-built Use Case Scenarios** — Enterprise Chatbot, RAG/Semantic Search, Code Assistant, Document Processing, Content Generation, Multilingual Apps, Image Analysis, and Voice Assistant.
- **Model Catalog** — Browse 30+ Azure AI models with filtering by category, provider, and region.
- **Side-by-Side Comparison** — Compare up to 4 models on capabilities, pricing, and performance.
- **Cost Calculator** — Estimate monthly and annual costs based on projected token usage.
- **Token Counter** — Paste text to estimate token counts for budgeting.
- **Code Snippet Generator** — Get ready-to-use Python/JavaScript/C# code for any model.
- **Live Azure Integration** — Optionally connect to your Azure subscription to validate deployed models.
- **Dark/Light Theme** — UI adapts to your preference with persistent theme storage.

## Architecture

```
┌─────────────────┐       ┌──────────────────────────┐
│   React SPA     │──────▶│  FastAPI Backend          │
│   (Vite + Nginx)│  /api │  - Model recommendation  │
│   Port 3000     │       │  - Cost estimation       │
└─────────────────┘       │  - Azure live status     │
                          │  Port 8000               │
                          └──────────┬───────────────┘
                                     │ (optional)
                          ┌──────────▼───────────────┐
                          │  Azure Cognitive Services │
                          │  (live model discovery)  │
                          └──────────────────────────┘
```

| Layer    | Stack                              |
|----------|-------------------------------------|
| Frontend | React 18, Vite 5, Recharts          |
| Backend  | Python 3.11+, FastAPI, Pydantic v2  |
| Infra    | Docker Compose, Nginx               |
| Azure    | azure-identity, azure-mgmt SDK      |

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose **or**
- Python 3.11+ and Node.js 18+

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/gagan3009/Azure-AI-Model-Selector.git
cd Azure-AI-Model-Selector

# (Optional) Configure Azure live integration
cp .env.example .env
# Edit .env and add your AZURE_SUBSCRIPTION_ID

# Start the application
docker compose up --build
```

The app will be available at:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs

### Local Development

**Backend:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at http://localhost:5173 with hot reload.

## API Reference

| Method | Endpoint                  | Description                          |
|--------|---------------------------|--------------------------------------|
| GET    | `/api/models`             | List all models (with optional filters) |
| GET    | `/api/models/{model_id}`  | Get a single model by ID             |
| POST   | `/api/models/recommend`   | Get ranked recommendations           |
| POST   | `/api/models/cost-estimate` | Estimate monthly/annual cost       |
| GET    | `/api/filters`            | Get available filter options         |
| GET    | `/api/azure/status`       | Check Azure live connection status   |
| GET    | `/health`                 | Health check endpoint                |

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

**Parameters:**

| Field                | Values                                              |
|----------------------|-----------------------------------------------------|
| `task_type`          | `chat`, `code`, `embedding`, `image`, `vision`, `speech`, `document`, `translation` |
| `budget`             | `low`, `medium`, `high`, `premium`                  |
| `performance_priority` | `latency`, `throughput`, `balanced`               |
| `context_window`     | `small`, `medium`, `large`, `very_large`            |
| `regions`            | Optional list of Azure regions                      |
| `use_case`           | Optional pre-built scenario ID                      |

## Environment Variables

| Variable                 | Required | Description                                |
|--------------------------|----------|--------------------------------------------|
| `AZURE_SUBSCRIPTION_ID`  | No       | Enables live Azure model discovery. Without it, the app runs in static catalog mode. |

## Project Structure

```
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── main.py                  # FastAPI application entry point
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── data/
│   │   └── models.json          # Model catalog data
│   ├── models/
│   │   └── schemas.py           # Pydantic request/response models
│   ├── routers/
│   │   └── models.py            # API route handlers
│   └── services/
│       ├── azure_client.py      # Optional Azure SDK integration
│       └── model_selector.py    # Recommendation engine logic
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── App.jsx              # Main application component
        ├── components/
        │   ├── SelectionForm.jsx
        │   ├── ModelResults.jsx
        │   ├── ModelCatalog.jsx
        │   ├── ModelComparison.jsx
        │   ├── CostCalculator.jsx
        │   ├── TokenCounter.jsx
        │   └── CodeSnippetGenerator.jsx
        └── services/
            └── api.js           # API client
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
