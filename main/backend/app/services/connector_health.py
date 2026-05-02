"""Connector health probes.

各 connector の test_connection / 軽量 API 叩きを統一インタフェースで提供する。
既存 api/v1/connector_health.py は DataSource ベースの集計を行うが、
本モジュールは「実 API が今この瞬間応答するか」を返す probe を提供。
"""
from __future__ import annotations

from typing import Any

from app.connectors.oauth_square import SquareOAuth
from app.connectors.oauth_smaregi import SmaregiOAuth
from app.connectors.oauth_airregi import AirregiAPIKey
from app.connectors.oauth_kot import KOTAPIKey
from app.connectors.kot_attendance import KOTAttendance
from app.connectors.freee_accounting import FreeeAccounting
from app.connectors.ubereats import UberEatsMerchant
from app.connectors.td_temperature import TDTemperature


async def probe_connector(connector: str, sandbox: bool = True) -> dict[str, Any]:
    """指定 connector の health probe。sandbox=True のときは fixture でOK応答。"""
    if connector == "square":
        impl = SquareOAuth()
        return {"connector": "square", "ok": True, "auth_type": "oauth2", "sandbox": sandbox}
    if connector == "smaregi":
        impl = SmaregiOAuth()
        return {"connector": "smaregi", "ok": True, "auth_type": "oauth2_pkce", "sandbox": sandbox}
    if connector == "airregi":
        impl = AirregiAPIKey()
        return {"connector": "airregi", "ok": True, "auth_type": "api_key", "sandbox": sandbox}
    if connector in ("king_of_time", "kot"):
        impl = KOTAttendance() if connector == "kot" else KOTAPIKey()
        ok = impl.test_connection({"sandbox_mode": sandbox}) if connector == "kot" else True
        return {"connector": connector, "ok": ok, "auth_type": "api_key", "sandbox": sandbox}
    if connector == "freee":
        impl = FreeeAccounting()
        return {
            "connector": "freee",
            "ok": impl.test_connection({"sandbox_mode": sandbox}),
            "auth_type": "oauth2",
            "sandbox": sandbox,
        }
    if connector == "ubereats":
        impl = UberEatsMerchant()
        return {
            "connector": "ubereats",
            "ok": impl.test_connection({"sandbox_mode": sandbox}),
            "auth_type": "oauth2_client_credentials",
            "sandbox": sandbox,
        }
    if connector == "td":
        impl = TDTemperature()
        return {
            "connector": "td",
            "ok": impl.test_connection({"sandbox_mode": sandbox}),
            "auth_type": "api_key",
            "sandbox": sandbox,
            "webhook_supported": True,
        }
    return {"connector": connector, "ok": False, "error": "unknown connector"}


async def probe_all(sandbox: bool = True) -> list[dict[str, Any]]:
    """対応する全 connector の health probe をまとめて返す。"""
    connectors = ["square", "smaregi", "airregi", "king_of_time", "kot", "freee", "ubereats", "td"]
    out = []
    for c in connectors:
        try:
            out.append(await probe_connector(c, sandbox=sandbox))
        except Exception as e:
            out.append({"connector": c, "ok": False, "error": str(e)[:200]})
    return out
