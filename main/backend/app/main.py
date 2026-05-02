"""FastAPI application entrypoint.

Wires up middleware, startup hooks (schema bootstrap + scheduler), and
all v1 routers.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    admin, ai, ai_chat, audit, campaigns, data_quality, demand,
    executive, expansion, health, incidents, ingestion, kpi_engine,
    kpi_registry, lineage, meeting, ontology, rbac, stores,
    supply_chain, sv, tasks, value, vertical, workflow, workspace, writeback,
)
from app.api.v1 import auth as auth_router
from app.api.v1 import data_sources as data_sources_router
from app.api.v1 import ai_governance as ai_governance_router
from app.api.v1 import workspace_engine as workspace_engine_router
from app.config import settings
from app.middleware.audit import AuditMiddleware
from app.middleware.pii import PIIRedactionMiddleware
from app.middleware.tenant import TenantMiddleware

logger = logging.getLogger("aentro")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema bootstrap (dev / demo only). Production uses alembic.
    if settings.AUTO_CREATE_SCHEMA:
        try:
            from app.database import engine, Base
            from app import models  # noqa: F401  ensure model registration

            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Schema ensured via Base.metadata.create_all")
        except Exception as e:
            logger.warning("AUTO_CREATE_SCHEMA failed: %s", e)

    # Optional ingestion scheduler. Off by default — opt in via
    # SCHEDULER_ENABLED=true to run nightly Smaregi syncs.
    if settings.SCHEDULER_ENABLED:
        try:
            from app.services.scheduler import start_scheduler
            start_scheduler()
            logger.info("Ingestion scheduler started")
        except Exception as e:
            logger.warning("Scheduler start failed: %s", e)

    yield


app = FastAPI(title="AENTRO Restaurant OS", version="1.0.0", lifespan=lifespan)

# Middleware order: outermost is registered LAST. We want
# tenant context resolved first so downstream middlewares can read it.
if settings.PII_REDACTION_ENABLED:
    app.add_middleware(PIIRedactionMiddleware)
app.add_middleware(AuditMiddleware)
app.add_middleware(TenantMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for router in [
    health.router,
    auth_router.router,
    executive.router,
    stores.router,
    tasks.router,
    sv.router,
    meeting.router,
    data_quality.router,
    value.router,
    ai.router,
    ontology.router,
    kpi_registry.router,
    lineage.router,
    writeback.router,
    admin.router,
    ingestion.router,
    kpi_engine.router,
    audit.router,
    workflow.router,
    incidents.router,
    supply_chain.router,
    demand.router,
    expansion.router,
    campaigns.router,
    ai_chat.router,
    workspace.router,
    rbac.router,
    vertical.router,
    data_sources_router.router,
    ai_governance_router.router,
    workspace_engine_router.router,
]:
    app.include_router(router)
