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
from services.cache import (
    model_catalog_cache, recommendation_cache, cost_estimate_cache,
    azure_api_cache, make_cache_key,
)

router = APIRouter()


@router.get("/models")
def list_models(
    category: Optional[str] = Query(None, description="Filter by category"),
    provider: Optional[str] = Query(None, description="Filter by provider"),
    region: Optional[str] = Query(None, description="Filter by region availability"),
):
    cache_key = make_cache_key("models_list", category, provider, region)
    cached = model_catalog_cache.get(cache_key)
    if cached is not None:
        return cached

    models = get_all_models(category=category, provider=provider, region=region)
    result = {"models": models, "count": len(models)}
    model_catalog_cache.set(cache_key, result)
    return result


@router.get("/models/{model_id}")
def get_model(model_id: str):
    cache_key = make_cache_key("model_detail", model_id)
    cached = model_catalog_cache.get(cache_key)
    if cached is not None:
        return cached

    model = get_model_by_id(model_id)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    model_catalog_cache.set(cache_key, model)
    return model


@router.post("/models/recommend", response_model=RecommendationResponse)
def recommend(criteria: SelectionCriteria):
    cache_key = make_cache_key("recommend", criteria.model_dump())
    cached = recommendation_cache.get(cache_key)
    if cached is not None:
        return cached

    recommendations, total = recommend_models(criteria)
    result = RecommendationResponse(
        criteria=criteria,
        recommendations=[ModelScore(**r) for r in recommendations],
        total_models_evaluated=total,
    )
    recommendation_cache.set(cache_key, result)
    return result


@router.post("/models/cost-estimate", response_model=CostEstimateResponse)
def cost_estimate(req: CostEstimateRequest):
    cache_key = make_cache_key("cost", req.model_id, req.monthly_input_tokens, req.monthly_output_tokens)
    cached = cost_estimate_cache.get(cache_key)
    if cached is not None:
        return cached

    result = estimate_cost(req.model_id, req.monthly_input_tokens, req.monthly_output_tokens)
    if not result:
        raise HTTPException(status_code=404, detail="Model not found")
    response = CostEstimateResponse(**result)
    cost_estimate_cache.set(cache_key, response)
    return response


@router.get("/filters", response_model=FilterOptions)
def filters():
    cached = model_catalog_cache.get("filter_options")
    if cached is not None:
        return cached

    options = get_filter_options()
    result = FilterOptions(**options)
    model_catalog_cache.set("filter_options", result)
    return result


@router.get("/azure/status")
def azure_status():
    return {
        "connected": azure_client.is_available,
        "circuit_breaker": azure_client.circuit_breaker.stats,
    }


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


@router.get("/cache/stats")
def cache_stats():
    """Return cache statistics for monitoring."""
    return {
        "caches": [
            model_catalog_cache.stats,
            recommendation_cache.stats,
            cost_estimate_cache.stats,
            azure_api_cache.stats,
        ]
    }


@router.post("/cache/clear")
def cache_clear():
    """Clear all caches. Use after data updates."""
    cleared = (
        model_catalog_cache.clear()
        + recommendation_cache.clear()
        + cost_estimate_cache.clear()
        + azure_api_cache.clear()
    )
    return {"cleared_entries": cleared, "message": "All caches cleared"}
