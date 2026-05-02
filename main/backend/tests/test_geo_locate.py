"""Geo フォールバック API のレスポンス構造テスト。

DB 不要のロジック分岐 (header hint vs fallback) と、
WiFi fingerprint の SSID 正規化をカバーする。実 DB は別 conftest 側で。
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _build_app():
    """geo router 単体だけ載せた最小 FastAPI を作る。
    main.py の middleware/DB を引き連れず、ip-locate のヘッダ分岐だけ検証。
    """
    from app.api.v1.geo import router

    app = FastAPI()
    app.include_router(router)
    return app


def test_ip_locate_falls_back_when_no_header():
    app = _build_app()
    client = TestClient(app)
    res = client.get("/api/v1/geo/ip-locate")
    assert res.status_code == 200
    body = res.json()
    data = body.get("data", body)
    assert data["lat"] == 35.6812
    assert data["lon"] == 139.7671
    assert data["accuracy_m"] == 50_000
    assert data["source"] == "fallback_default"


def test_ip_locate_uses_cloudflare_headers():
    app = _build_app()
    client = TestClient(app)
    res = client.get(
        "/api/v1/geo/ip-locate",
        headers={
            "cf-iplatitude": "34.6937",
            "cf-iplongitude": "135.5023",
            "cf-ipcity": "Osaka",
            "cf-ipcountry": "JP",
        },
    )
    assert res.status_code == 200
    data = res.json().get("data", {})
    assert abs(data["lat"] - 34.6937) < 1e-4
    assert abs(data["lon"] - 135.5023) < 1e-4
    assert data["city"] == "Osaka"
    assert data["country"] == "JP"
    assert data["source"] == "ip_header_hint"


def test_ip_locate_uses_vercel_headers():
    app = _build_app()
    client = TestClient(app)
    res = client.get(
        "/api/v1/geo/ip-locate",
        headers={
            "x-vercel-ip-latitude": "35.0116",
            "x-vercel-ip-longitude": "135.7681",
            "x-vercel-ip-city": "Kyoto",
            "x-vercel-ip-country": "JP",
        },
    )
    assert res.status_code == 200
    data = res.json().get("data", {})
    assert data["city"] == "Kyoto"


def test_ip_locate_invalid_header_falls_back():
    app = _build_app()
    client = TestClient(app)
    res = client.get(
        "/api/v1/geo/ip-locate",
        headers={"cf-iplatitude": "not-a-number", "cf-iplongitude": "x"},
    )
    assert res.status_code == 200
    data = res.json().get("data", {})
    assert data["source"] == "fallback_default"


def test_clock_in_low_accuracy_constant_exists():
    """clock_in に accuracy_m 引数と GPS_LOW_ACCURACY_THRESHOLD_M が定義されている。"""
    from app.services import face_auth_engine
    import inspect

    assert hasattr(face_auth_engine, "GPS_LOW_ACCURACY_THRESHOLD_M")
    assert face_auth_engine.GPS_LOW_ACCURACY_THRESHOLD_M == 200.0
    sig = inspect.signature(face_auth_engine.clock_in)
    assert "accuracy_m" in sig.parameters
