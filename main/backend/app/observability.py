"""OpenTelemetry initialization — opt-in via OTEL_ENABLED env var.

When enabled, instruments FastAPI, SQLAlchemy, and httpx automatically.
Exports OTLP traces+metrics to OTEL_EXPORTER_OTLP_ENDPOINT (default: localhost:4317).

Soft-import: if opentelemetry packages aren't installed, the function is a no-op
so dev/CI without OTel installed still boots normally.
"""
import logging

from app.config import settings

logger = logging.getLogger(__name__)

_INSTRUMENTED = {"fastapi": False, "sqlalchemy": False, "httpx": False, "tracer": False}


def _ensure_tracer_provider():
    if _INSTRUMENTED["tracer"]:
        return True
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    except ImportError:
        return False
    resource = Resource.create({"service.name": settings.OTEL_SERVICE_NAME})
    provider = TracerProvider(resource=resource)
    endpoint = settings.OTEL_EXPORTER_OTLP_ENDPOINT or "localhost:4317"
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint, insecure=True)))
    trace.set_tracer_provider(provider)
    _INSTRUMENTED["tracer"] = True
    return True


def instrument_fastapi(app) -> bool:
    if not settings.OTEL_ENABLED or _INSTRUMENTED["fastapi"]:
        return False
    if not _ensure_tracer_provider():
        return False
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
        _INSTRUMENTED["fastapi"] = True
        logger.info("OTEL FastAPI instrumentation enabled")
        return True
    except Exception as e:
        logger.warning("OTEL FastAPI instrumentation failed: %s", e)
        return False


def instrument_sqlalchemy(engine=None) -> bool:
    if not settings.OTEL_ENABLED or _INSTRUMENTED["sqlalchemy"]:
        return False
    if not _ensure_tracer_provider():
        return False
    try:
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        kwargs = {}
        if engine is not None:
            # async engine has .sync_engine attribute
            sync_engine = getattr(engine, "sync_engine", engine)
            kwargs["engine"] = sync_engine
        SQLAlchemyInstrumentor().instrument(**kwargs)
        _INSTRUMENTED["sqlalchemy"] = True
        logger.info("OTEL SQLAlchemy instrumentation enabled")
        return True
    except Exception as e:
        logger.warning("OTEL SQLAlchemy instrumentation failed: %s", e)
        return False


def instrument_httpx() -> bool:
    if not settings.OTEL_ENABLED or _INSTRUMENTED["httpx"]:
        return False
    if not _ensure_tracer_provider():
        return False
    try:
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
        HTTPXClientInstrumentor().instrument()
        _INSTRUMENTED["httpx"] = True
        logger.info("OTEL httpx instrumentation enabled")
        return True
    except Exception as e:
        logger.warning("OTEL httpx instrumentation failed: %s", e)
        return False


def init_observability(app, engine=None) -> dict:
    """Initialize all OTEL instrumentations + return status."""
    status = {
        "otel_enabled": settings.OTEL_ENABLED,
        "fastapi": instrument_fastapi(app),
        "sqlalchemy": instrument_sqlalchemy(engine),
        "httpx": instrument_httpx(),
    }
    return status


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
