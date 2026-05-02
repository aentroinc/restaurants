"""OpenTelemetry instrumentation hooks.

When OTEL_ENABLED=true and the optional opentelemetry-* packages are
installed, FastAPI / SQLAlchemy / httpx are auto-instrumented and tenant
context is exported as a span attribute.

This module is a no-op when the packages are missing — keeping the
runtime requirements lean while making prod-grade observability a single
flag flip.
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger("aentro.otel")


def setup_observability(app, db_engine=None) -> bool:
    """Returns True when instrumentation succeeded, else False (no-op)."""
    if os.environ.get("OTEL_ENABLED", "false").lower() != "true":
        return False
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError as e:
        logger.warning("OpenTelemetry libs not installed: %s — instrumentation skipped", e)
        return False

    resource = Resource.create({
        "service.name": os.environ.get("OTEL_SERVICE_NAME", "aentro-backend"),
        "service.version": os.environ.get("OTEL_SERVICE_VERSION", "1.0.0"),
        "deployment.environment": os.environ.get("ENVIRONMENT", "local"),
    })
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter()  # honors OTEL_EXPORTER_OTLP_ENDPOINT
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    if db_engine is not None:
        SQLAlchemyInstrumentor().instrument(engine=db_engine.sync_engine if hasattr(db_engine, "sync_engine") else db_engine)

    @app.middleware("http")
    async def _tag_tenant(request, call_next):
        from app.core.tenant_context import get_tenant
        span = trace.get_current_span()
        if span is not None:
            tid = get_tenant()
            if tid:
                span.set_attribute("tenant.id", str(tid))
        return await call_next(request)

    logger.info("OpenTelemetry instrumentation enabled")
    return True
