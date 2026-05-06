from pydantic import BaseModel
from typing import Optional


class SelectionCriteria(BaseModel):
    task_type: str  # chat, embedding, image, code, speech, vision, document, translation
    budget: str  # low, medium, high, premium
    performance_priority: str  # latency, throughput, balanced
    context_window: str  # small, medium, large, very_large
    regions: Optional[list[str]] = None
    use_case: Optional[str] = None  # predefined scenario


class ModelScore(BaseModel):
    model_id: str
    name: str
    provider: str
    category: str
    match_score: float
    explanation: str
    pricing_tier: str
    context_window: int
    capabilities: list[str]
    best_for: list[str]
    supported_regions: list[str]
    estimated_cost_input: float
    estimated_cost_output: float
    latency_tier: Optional[str] = None
    throughput_tier: Optional[str] = None
    strengths: Optional[str] = None


class RecommendationResponse(BaseModel):
    criteria: SelectionCriteria
    recommendations: list[ModelScore]
    total_models_evaluated: int


class FilterOptions(BaseModel):
    task_types: list[str]
    budget_tiers: list[str]
    performance_priorities: list[str]
    context_windows: list[str]
    regions: list[str]
    providers: list[str]
    categories: list[str]
    use_cases: list[dict]


class CostEstimateRequest(BaseModel):
    model_id: str
    monthly_input_tokens: float  # in millions
    monthly_output_tokens: float  # in millions


class CostEstimateResponse(BaseModel):
    model_id: str
    model_name: str
    monthly_input_cost: float
    monthly_output_cost: float
    total_monthly_cost: float
    annual_cost: float
