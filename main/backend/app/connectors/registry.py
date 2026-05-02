from app.connectors.base import BaseConnector
from app.connectors.csv_connector import CSVConnector
from app.connectors.smaregi import SmaregiConnector
from app.connectors.airregi import AirregiConnector
from app.connectors.square import SquareConnector
from app.connectors.king_of_time import KingOfTimeConnector

CONNECTOR_REGISTRY: dict[str, type[BaseConnector]] = {
    "csv": CSVConnector,
    "smaregi": SmaregiConnector,
    "airregi": AirregiConnector,
    "square": SquareConnector,
    "king_of_time": KingOfTimeConnector,
}


def get_connector(source_type: str) -> BaseConnector:
    cls = CONNECTOR_REGISTRY.get(source_type)
    if not cls:
        raise ValueError(f"Unknown connector: {source_type}")
    return cls()


def list_connectors() -> list[dict]:
    results = []
    for cls in CONNECTOR_REGISTRY.values():
        c = cls()
        results.append({
            "source_type": c.source_type,
            "name": c.name,
            "auth_type": c.auth_type,
            "system_category": c.system_category,
            "available": True,
        })
    return results
