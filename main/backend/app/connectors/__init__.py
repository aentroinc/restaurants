"""External data connectors (POS / 勤怠 / 物流).

Each connector subclasses BaseConnector and implements authenticate / fetch /
transform. The IngestionRunner orchestrates fetch -> transform -> Bronze
(IngestionRecord) -> Silver (canonical model).
"""
from app.connectors.base import BaseConnector, ConnectorRegistry, FetchResult, CanonicalRecord

__all__ = ["BaseConnector", "ConnectorRegistry", "FetchResult", "CanonicalRecord"]
