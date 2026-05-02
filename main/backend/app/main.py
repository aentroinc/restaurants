from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import health, executive, stores, tasks, sv, meeting, data_quality, value, ai, ontology, kpi_registry, lineage, writeback, admin, ingestion, workflow
from app.api.v1 import auth as auth_router
from app.api.v1 import kpi_engine, audit
from app.api.v1 import incidents, supply_chain, demand, expansion, campaigns
from app.api.v1 import ai_chat
from app.api.v1 import workspace, rbac
from app.api.v1 import vertical
from app.api.v1 import connectors
from app.api.v1 import identity_providers, access_logs
from app.api.v1 import pilots, connector_health, security as security_router
from app.middleware.tenant import TenantMiddleware
from app.middleware.access_log import AccessLogMiddleware

app = FastAPI(title="AENTRO Restaurant OS", version="1.0.0")

app.add_middleware(AccessLogMiddleware)
app.add_middleware(TenantMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth_router.router)
app.include_router(executive.router)
app.include_router(stores.router)
app.include_router(tasks.router)
app.include_router(sv.router)
app.include_router(meeting.router)
app.include_router(data_quality.router)
app.include_router(value.router)
app.include_router(ai.router)
app.include_router(ontology.router)
app.include_router(kpi_registry.router)
app.include_router(lineage.router)
app.include_router(writeback.router)
app.include_router(admin.router)
app.include_router(ingestion.router)
app.include_router(kpi_engine.router)
app.include_router(audit.router)
app.include_router(workflow.router)
app.include_router(incidents.router)
app.include_router(supply_chain.router)
app.include_router(demand.router)
app.include_router(expansion.router)
app.include_router(campaigns.router)
app.include_router(ai_chat.router)
app.include_router(workspace.router)
app.include_router(rbac.router)
app.include_router(vertical.router)
app.include_router(connectors.router)
app.include_router(identity_providers.router)
app.include_router(access_logs.router)
app.include_router(pilots.router)
app.include_router(connector_health.router)
app.include_router(security_router.router)
