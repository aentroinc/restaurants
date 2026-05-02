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
from app.api.v1 import workflow_ai, deploy_status
from app.api.v1 import documents as documents_router
from app.api.v1 import budget as budget_router
from app.api.v1 import ai_eval, ai_threads
from app.api.v1 import sso as sso_router
from app.api.v1 import scim_v2 as scim_router
from app.api.v1 import actions as ontology_actions_router
from app.api.v1 import ontology_branches as ontology_branches_router
from app.api.v1 import pipeline as pipeline_router
from app.api.v1 import oauth as oauth_router
from app.api.v1 import observability as observability_router
from app.middleware.tenant import TenantMiddleware
from app.middleware.access_log import AccessLogMiddleware
from app.middleware.audit_capture import AuditCaptureMiddleware
from app.middleware.dq_check import DataQualityCheckMiddleware
from app.middleware.metrics import register_metrics
from app.observability import setup_observability, init_observability
from app.services.lifespan_hooks import on_startup as _pipeline_on_startup, on_shutdown as _pipeline_on_shutdown
from app.database import engine as _engine

app = FastAPI(title="AENTRO Restaurant OS", version="1.0.0")

setup_observability(app)
init_observability(app, _engine)

# Middleware order: outermost first. CORS → DQCheck → AuditCapture → AccessLog → Tenant.
app.add_middleware(DataQualityCheckMiddleware)
app.add_middleware(AuditCaptureMiddleware)
app.add_middleware(AccessLogMiddleware)
app.add_middleware(TenantMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_metrics(app)


@app.on_event("startup")
async def _on_startup():
    await _pipeline_on_startup(app)


@app.on_event("shutdown")
async def _on_shutdown():
    await _pipeline_on_shutdown(app)

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
app.include_router(workflow_ai.router)
app.include_router(deploy_status.router)
app.include_router(documents_router.router)
app.include_router(budget_router.router)
app.include_router(ai_eval.router)
app.include_router(ai_threads.router)
app.include_router(sso_router.router)
app.include_router(scim_router.router)
app.include_router(ontology_actions_router.router)
app.include_router(ontology_branches_router.router)
app.include_router(pipeline_router.router)
app.include_router(oauth_router.router)
app.include_router(observability_router.router)
