"""Idempotency middleware の logic テスト（in-memory cache 部分のみ）。

DB バックアップは Postgres を要するためここでは検証しない（test_api.py の
統合テストでカバー）。中核ロジック（key 一致 → 同レスポンス、key 違い → 別実行）
を Starlette の TestClient で検証する。
"""
from __future__ import annotations

import json
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware import idempotency as idem
from app.middleware.idempotency import IdempotencyMiddleware


def _build_app(counter: dict) -> FastAPI:
    app = FastAPI()
    app.add_middleware(IdempotencyMiddleware)

    @app.post("/echo")
    async def echo(payload: dict):
        counter["calls"] = counter.get("calls", 0) + 1
        return {"call": counter["calls"], "echo": payload}

    @app.get("/ping")
    async def ping():
        counter["pings"] = counter.get("pings", 0) + 1
        return {"ok": True}

    return app


def setup_function(_):
    # 各テスト前に in-memory cache をクリア
    idem._CACHE.clear()


def test_same_key_returns_same_response():
    counter: dict = {}
    client = TestClient(_build_app(counter))

    key = "abcdef-12345-67890-aaaa"
    r1 = client.post("/echo", json={"v": 1}, headers={"Idempotency-Key": key})
    assert r1.status_code == 200
    body1 = r1.json()
    assert body1["call"] == 1

    r2 = client.post("/echo", json={"v": 999}, headers={"Idempotency-Key": key})
    assert r2.status_code == 200
    # 同じ key → 同じレスポンスを返す（ハンドラは再実行されない）
    assert r2.json() == body1
    assert counter["calls"] == 1
    # replay ヘッダ
    assert r2.headers.get("X-Idempotent-Replay") == "true"


def test_different_keys_execute_independently():
    counter: dict = {}
    client = TestClient(_build_app(counter))

    r1 = client.post("/echo", json={"v": 1}, headers={"Idempotency-Key": "key-aaaaaaaa1"})
    r2 = client.post("/echo", json={"v": 2}, headers={"Idempotency-Key": "key-bbbbbbbb2"})
    assert r1.json()["call"] == 1
    assert r2.json()["call"] == 2
    assert counter["calls"] == 2


def test_no_key_passes_through():
    counter: dict = {}
    client = TestClient(_build_app(counter))

    r1 = client.post("/echo", json={"v": 1})
    r2 = client.post("/echo", json={"v": 1})
    # key がなければ毎回実行される
    assert r1.json()["call"] == 1
    assert r2.json()["call"] == 2


def test_get_is_not_cached():
    counter: dict = {}
    client = TestClient(_build_app(counter))

    r1 = client.get("/ping", headers={"Idempotency-Key": "key-cccccccc3"})
    r2 = client.get("/ping", headers={"Idempotency-Key": "key-cccccccc3"})
    assert r1.json()["ok"] is True
    assert counter["pings"] == 2  # GET はキャッシュ対象外


def test_invalid_key_format_passes_through():
    counter: dict = {}
    client = TestClient(_build_app(counter))

    # 7 文字 → 短すぎるので無視されるはず
    r1 = client.post("/echo", json={"v": 1}, headers={"Idempotency-Key": "short"})
    r2 = client.post("/echo", json={"v": 1}, headers={"Idempotency-Key": "short"})
    assert counter["calls"] == 2


def test_4xx_response_is_not_cached():
    """4xx はリトライで成功する可能性があるためキャッシュしない。"""
    app = FastAPI()
    app.add_middleware(IdempotencyMiddleware)
    state: dict = {"calls": 0}

    @app.post("/maybe-fail")
    async def maybe_fail():
        state["calls"] += 1
        if state["calls"] == 1:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="bad")
        return {"ok": True}

    client = TestClient(app)
    key = "key-retry-aaaaaaaa"
    r1 = client.post("/maybe-fail", headers={"Idempotency-Key": key})
    assert r1.status_code == 400
    # 4xx は保存されない → 同 key でも再実行される
    r2 = client.post("/maybe-fail", headers={"Idempotency-Key": key})
    assert r2.status_code == 200
    assert r2.json() == {"ok": True}
    assert state["calls"] == 2
