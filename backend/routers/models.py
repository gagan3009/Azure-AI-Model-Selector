from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from models.schemas import (
    SelectionCriteria, RecommendationResponse, FilterOptions, ModelScore,
    CostEstimateRequest, CostEstimateResponse,
)
from services.model_selector import (
    recommend_models, get_all_models, get_model_by_id, get_filter_options, estimate_cost,
)
from services.azure_client import azure_client

router = APIRouter()


@router.get("/models")
def list_models(
    category: Optional[str] = Query(None, description="Filter by category"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    region: Optional[str] = Query(None, description="Filter by region availability"),
):
    models = get_all_models(category=category, provider=provider, region=region)
    return {"models": models, "count": len(models)}


@router.get("/models/{model_id}")
def get_model(model_id: str):
    model = get_model_by_id(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return model


@router.post("/models/recommend", response_model=RecommendationResponse)
def recommend(criteria: SelectionCriteria):
    recommendations, total = recommend_models(criteria)
    return RecommendationResponse(
        criteria=criteria,
        recommendations=[ModelScore(**r) for r in recommendations],
        total_models_evaluated=total,
    )


@router.post("/models/cost-estimate", response_model=CostEstimateResponse)
def cost_estimate(req: CostEstimateRequest):
    result = estimate_cost(req.model_id, req.monthly_input_tokens, req.monthly_output_tokens)
    if not result:
        raise HTTPException(status_code=404, detail="Model not found")
    return CostEstimateResponse(**result)


@router.get("/filters", response_model=FilterOptions)
def filters():
    options = get_filter_options()
    return FilterOptions(**options)


@router.get("/azure/status")
def azure_status():
    return {"connected": azure_client.is_available}


@router.get("/azure/deployments")
def azure_deployments(resource_group: Optional[str] = Query(None)):
    if not azure_client.is_available:
        return {"error": "Azure integration not configured. Set AZURE_SUBSCRIPTION_ID environment variable.", "deployments": []}
    deployments = azure_client.list_deployments(resource_group=resource_group)
    return {"deployments": deployments, "count": len(deployments)}


@router.get("/azure/validate/{model_id}")
def validate_model(model_id: str, region: str = Query(..., description="Azure region to check")):
    if not azure_client.is_available:
        return {"error": "Azure integration not configured"}
    result = azure_client.check_model_availability(model_id, region)
    return result
