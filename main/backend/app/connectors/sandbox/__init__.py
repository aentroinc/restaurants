"""Provider sandbox response fixtures (JSON) for offline E2E.

Each *_response.json mirrors the shape of the real provider response so
the live connector code can be exercised end-to-end without hitting the
external API."""
import json
from pathlib import Path

_DIR = Path(__file__).parent


def load_fixture(name: str) -> dict | list:
    with (_DIR / f"{name}.json").open() as f:
        return json.load(f)
