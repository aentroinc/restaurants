from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import health, executive, stores, tasks, sv, meeting, data_quality, value, ai, ontology, kpi_registry, lineage, writeback, admin, ingestion, workflow
from app.api.v1 import auth as auth_router
from app.api.v1 import kpi_engine, audit
from app.middleware.tenant import TenantMiddleware

app = FastAPI(title="AENTRO Restaurant OS", version="1.0.0")

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
