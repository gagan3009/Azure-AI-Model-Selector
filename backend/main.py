from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import models

app = FastAPI(
    title="Azure AI Model Selection API",
    description="API to recommend the best Azure AI model based on requirements",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "healthy"}
