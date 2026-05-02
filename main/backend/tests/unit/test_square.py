"""Unit tests for Square connector + transform + webhook HMAC."""
import hashlib
import hmac
import base64

from app.connectors.square.connector import SquareConnector
from app.connectors.square.transform import transform_orders


SAMPLE_ORDER = {
    "id": "sq-1",
    "location_id": "loc-1",
    "created_at": "2026-04-30T12:30:00+09:00",
    "net_amounts": {"total_money": {"amount": 1500, "currency": "JPY"}},
    "guests_count": 1,
    "line_items": [
        {"catalog_object_id": "p1", "name": "コーヒー", "quantity": 1, "base_price_money": {"amount": 500}},
        {"catalog_object_id": "p2", "name": "サンドイッチ", "quantity": 1, "base_price_money": {"amount": 1000}},
    ],
}


def test_transform_aggregates():
    out = transform_orders([SAMPLE_ORDER])
    daily = [r for r in out if r.target_table == "daily_sales"]
    hourly = [r for r in out if r.target_table == "hourly_sales"]
    product = [r for r in out if r.target_table == "product_sales"]
    assert len(daily) == 1
    assert daily[0].payload["net_sales"] == 1500.0
    assert len(hourly) == 1
    assert len(product) == 2


def test_webhook_hmac_valid():
    body = b'{"event":"order.updated"}'
    secret = "very-secret"
    sig = base64.b64encode(hmac.new(secret.encode(), body, hashlib.sha256).digest()).decode()
    assert SquareConnector.verify_webhook(signature_header=sig, body=body, secret=secret) is True


def test_webhook_hmac_invalid():
    body = b'{"event":"order.updated"}'
    secret = "very-secret"
    bogus = base64.b64encode(b"00000000000000000000000000000000").decode()
    assert SquareConnector.verify_webhook(signature_header=bogus, body=body, secret=secret) is False


def test_webhook_url_plus_body_variant():
    """Square sometimes signs url+body; helper should accept both."""
    body = b"{}"
    secret = "s"
    url = "https://example/webhook"
    sig = base64.b64encode(hmac.new(secret.encode(), url.encode() + body, hashlib.sha256).digest()).decode()
    assert SquareConnector.verify_webhook(signature_header=sig, body=body, secret=secret, url=url) is True
