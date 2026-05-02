import anthropic
from app.config import settings

_client = None

MODEL_MAP = {
    "deep": "claude-opus-4-20250514",
    "default": "claude-sonnet-4-20250514",
    "fast": "claude-haiku-4-5-20251001",
}


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None and settings.ANTHROPIC_API_KEY:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def get_model(tier: str = "default") -> str:
    return MODEL_MAP.get(tier, MODEL_MAP["default"])


def is_llm_available() -> bool:
    return bool(settings.ANTHROPIC_API_KEY)


def record_usage(model: str, response) -> None:
    """Record AI token usage from an Anthropic Messages response.

    Lazy import of metrics helper to avoid a top-level import cycle
    (middleware.metrics imports starlette/fastapi; importing it from
    app.services.ai.client at module import time risks circular imports
    with app.main during startup wiring).
    """
    try:
        usage = getattr(response, "usage", None)
        if usage is None:
            return
        from app.middleware.metrics import record_ai_tokens
        record_ai_tokens(
            model,
            getattr(usage, "input_tokens", 0) or 0,
            getattr(usage, "output_tokens", 0) or 0,
        )
    except Exception:
        # never let metrics break a real call
        pass
