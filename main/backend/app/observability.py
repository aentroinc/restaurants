"""OpenTelemetry initialization — opt-in via OTEL_ENABLED env var.

When enabled, instruments FastAPI, SQLAlchemy, and httpx automatically.
Exports OTLP traces+metrics to OTEL_EXPORTER_OTLP_ENDPOINT (default: localhost:4317).

Soft-import: if opentelemetry packages aren't installed, the function is a no-op
so dev/CI without OTel installed still boots normally.
"""
import logging

from app.config import settings

logger = logging.getLogger(__name__)


def setup_observability(app) -> None:
    if not settings.OTEL_ENABLED:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    except ImportError:
        logger.warning("OTEL_ENABLED=true but opentelemetry packages not installed; skipping")
        return

    resource = Resource.create({"service.name": settings.OTEL_SERVICE_NAME})
    provider = TracerProvider(resource=resource)
    endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT or "localhost:4317"
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)

    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        SQLAlchemyInstrumentor().instrument()
    except ImportError:
        pass

    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        HTTPXClientInstrumentor().instrument()
    except ImportError:
        pass

    logger.info("OpenTelemetry initialized — exporting to %s", endpoint)
