from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import health, executive, stores, tasks, sv, meeting, data_quality, value, ai

app = FastAPI(title="AENTRO Restaurant OS", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(executive.router)
app.include_router(stores.router)
app.include_router(tasks.router)
app.include_router(sv.router)
app.include_router(meeting.router)
app.include_router(data_quality.router)
app.include_router(value.router)
app.include_router(ai.router)
