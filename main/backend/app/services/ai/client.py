import anthropic
from app.config import settings

_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None and settings.ANTHROPIC_API_KEY:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


def is_llm_available() -> bool:
    return bool(settings.ANTHROPIC_API_KEY)
