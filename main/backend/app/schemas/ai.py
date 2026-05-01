from pydantic import BaseModel
from decimal import Decimal
from typing import Any


class AIQueryRequest(BaseModel):
    question: str
    tenant_id: str | None = None


class ReferencedEntity(BaseModel):
    entity_type: str
    entity_id: str
    entity_name: str


class AIQueryResponse(BaseModel):
    conclusion: str
    facts: list[str]
    hypotheses: list[str]
    recommended_actions: list[str]
    estimated_impact_amount: Decimal | None = None
    confidence: str
    referenced_entities: list[ReferencedEntity] = []


class SuggestedQuestion(BaseModel):
    question: str
    category: str
