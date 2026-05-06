import json
from pathlib import Path

DATA_PATH = Path(__file__).parent.parent / "data" / "models.json"

TASK_TYPE_MAP = {
    "chat": ["chat", "completion", "function_calling"],
    "code": ["code_generation", "chat", "completion"],
    "embedding": ["embeddings", "multilingual_embeddings"],
    "image": ["image_generation"],
    "vision": ["vision", "image_analysis", "ocr", "object_detection"],
    "speech": ["speech_to_text", "text_to_speech", "transcription"],
    "document": ["document_extraction", "form_recognition", "ocr"],
    "translation": ["text_translation", "speech_translation", "transliteration"],
}

BUDGET_ORDER = {"low": 1, "medium": 2, "high": 3, "premium": 4}

CONTEXT_WINDOW_RANGES = {
    "small": (0, 8192),
    "medium": (8193, 32768),
    "large": (32769, 128000),
    "very_large": (128001, float("inf")),
}

USE_CASE_SCENARIOS = [
    {
        "id": "enterprise_chatbot",
        "name": "Enterprise Chatbot",
        "description": "Customer-facing conversational AI with function calling",
        "criteria": {"task_type": "chat", "budget": "medium", "performance_priority": "latency", "context_window": "large"},
    },
    {
        "id": "rag_search",
        "name": "RAG / Semantic Search",
        "description": "Retrieval-augmented generation with vector embeddings",
        "criteria": {"task_type": "embedding", "budget": "low", "performance_priority": "throughput", "context_window": "small"},
    },
    {
        "id": "code_assistant",
        "name": "Code Assistant",
        "description": "AI pair programmer for code generation and review",
        "criteria": {"task_type": "code", "budget": "high", "performance_priority": "balanced", "context_window": "very_large"},
    },
    {
        "id": "document_processing",
        "name": "Document Processing",
        "description": "Extract data from invoices, forms, and scanned documents",
        "criteria": {"task_type": "document", "budget": "medium", "performance_priority": "throughput", "context_window": "small"},
    },
    {
        "id": "content_generation",
        "name": "Content Generation",
        "description": "Marketing copy, blog posts, and creative writing at scale",
        "criteria": {"task_type": "chat", "budget": "low", "performance_priority": "throughput", "context_window": "medium"},
    },
    {
        "id": "multilingual_app",
        "name": "Multilingual Application",
        "description": "Real-time translation and multilingual content processing",
        "criteria": {"task_type": "translation", "budget": "low", "performance_priority": "latency", "context_window": "medium"},
    },
    {
        "id": "image_analysis",
        "name": "Image & Video Analysis",
        "description": "Object detection, OCR, and visual content understanding",
        "criteria": {"task_type": "vision", "budget": "medium", "performance_priority": "throughput", "context_window": "small"},
    },
    {
        "id": "voice_assistant",
        "name": "Voice Assistant",
        "description": "Speech-to-text and text-to-speech for voice interfaces",
        "criteria": {"task_type": "speech", "budget": "medium", "performance_priority": "latency", "context_window": "small"},
    },
]


def load_models():
    with open(DATA_PATH, "r") as f:
        return json.load(f)


def score_model(model, criteria):
    score = 0.0
    explanations = []

    # Task type matching (weight: 40%)
    task_capabilities = TASK_TYPE_MAP.get(criteria.task_type, [])
    matching_caps = set(model["capabilities"]) & set(task_capabilities)
    if matching_caps:
        task_score = len(matching_caps) / len(task_capabilities) if task_capabilities else 0
        score += task_score * 40
        explanations.append(f"Matches task type '{criteria.task_type}' with capabilities: {', '.join(matching_caps)}")
    else:
        # Check best_for as fallback
        best_for_match = any(criteria.task_type.lower() in bf.lower() for bf in model["best_for"])
        if best_for_match:
            score += 20
            explanations.append(f"Partially matches task type via best-for use cases")
        else:
            explanations.append(f"Does not match task type '{criteria.task_type}'")
            return 0, "Not suitable for this task type"

    # Budget matching (weight: 25%)
    model_budget = BUDGET_ORDER.get(model["pricing_tier"], 3)
    user_budget = BUDGET_ORDER.get(criteria.budget, 3)
    if model_budget <= user_budget:
        budget_score = 1.0 - (model_budget - 1) / 4
        score += budget_score * 25
        explanations.append(f"Within budget (model: {model['pricing_tier']}, max: {criteria.budget})")
    else:
        penalty = (model_budget - user_budget) * 8
        score -= penalty
        explanations.append(f"Exceeds budget (model: {model['pricing_tier']}, max: {criteria.budget})")

    # Performance matching (weight: 20%)
    if criteria.performance_priority == "latency":
        if model["latency_tier"] == "low":
            score += 20
            explanations.append("Excellent latency")
        elif model["latency_tier"] == "medium":
            score += 10
            explanations.append("Moderate latency")
        else:
            score += 3
            explanations.append("Higher latency")
    elif criteria.performance_priority == "throughput":
        if model["throughput_tier"] == "high":
            score += 20
            explanations.append("Excellent throughput")
        elif model["throughput_tier"] == "medium":
            score += 10
            explanations.append("Moderate throughput")
        else:
            score += 3
            explanations.append("Lower throughput")
    else:  # balanced
        latency_score = {"low": 10, "medium": 6, "high": 2}.get(model["latency_tier"], 5)
        throughput_score = {"high": 10, "medium": 6, "low": 2}.get(model["throughput_tier"], 5)
        score += latency_score + throughput_score
        explanations.append("Balanced performance profile")

    # Context window matching (weight: 10%)
    ctx_min, ctx_max = CONTEXT_WINDOW_RANGES.get(criteria.context_window, (0, float("inf")))
    if model["context_window"] >= ctx_min:
        score += 10
        explanations.append(f"Context window ({model['context_window']:,} tokens) meets requirement")
    elif model["context_window"] > 0:
        ratio = model["context_window"] / ctx_min
        score += ratio * 10
        explanations.append(f"Context window ({model['context_window']:,} tokens) partially meets requirement")

    # Region matching (weight: 5%)
    if criteria.regions:
        matching_regions = set(criteria.regions) & set(model["supported_regions"])
        if matching_regions:
            region_score = len(matching_regions) / len(criteria.regions)
            score += region_score * 5
            explanations.append(f"Available in {len(matching_regions)}/{len(criteria.regions)} requested regions")
        else:
            score -= 5
            explanations.append("Not available in any requested region")
    else:
        score += 5
        explanations.append("No region constraint")

    return max(score, 0), "; ".join(explanations)


def recommend_models(criteria):
    models = load_models()
    scored = []

    for model in models:
        score, explanation = score_model(model, criteria)
        if score > 0:
            scored.append({
                "model_id": model["id"],
                "name": model["name"],
                "provider": model["provider"],
                "category": model["category"],
                "match_score": round(min(score, 100), 1),
                "explanation": explanation,
                "pricing_tier": model["pricing_tier"],
                "context_window": model["context_window"],
                "capabilities": model["capabilities"],
                "best_for": model["best_for"],
                "supported_regions": model["supported_regions"],
                "estimated_cost_input": model["estimated_cost_input"],
                "estimated_cost_output": model["estimated_cost_output"],
                "latency_tier": model["latency_tier"],
                "throughput_tier": model["throughput_tier"],
                "strengths": model["strengths"],
            })

    scored.sort(key=lambda x: x["match_score"], reverse=True)
    return scored, len(models)


def get_all_models(category=None, provider=None, region=None):
    models = load_models()
    if category:
        models = [m for m in models if m["category"] == category]
    if provider:
        models = [m for m in models if provider.lower() in m["provider"].lower()]
    if region:
        models = [m for m in models if region in m["supported_regions"]]
    return models


def get_model_by_id(model_id):
    models = load_models()
    for model in models:
        if model["id"] == model_id:
            return model
    return None


def get_filter_options():
    models = load_models()
    regions = set()
    providers = set()
    categories = set()
    for model in models:
        regions.update(model["supported_regions"])
        providers.add(model["provider"])
        categories.add(model["category"])

    return {
        "task_types": list(TASK_TYPE_MAP.keys()),
        "budget_tiers": ["low", "medium", "high", "premium"],
        "performance_priorities": ["latency", "throughput", "balanced"],
        "context_windows": ["small", "medium", "large", "very_large"],
        "regions": sorted(regions),
        "providers": sorted(providers),
        "categories": sorted(categories),
        "use_cases": USE_CASE_SCENARIOS,
    }


def estimate_cost(model_id, monthly_input_tokens, monthly_output_tokens):
    model = get_model_by_id(model_id)
    if not model:
        return None
    input_cost = model["estimated_cost_input"] * monthly_input_tokens
    output_cost = model["estimated_cost_output"] * monthly_output_tokens
    total = input_cost + output_cost
    return {
        "model_id": model_id,
        "model_name": model["name"],
        "monthly_input_cost": round(input_cost, 2),
        "monthly_output_cost": round(output_cost, 2),
        "total_monthly_cost": round(total, 2),
        "annual_cost": round(total * 12, 2),
    }
