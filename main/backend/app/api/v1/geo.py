"""Geo フォールバック API。GPS 不可時の最終手段:
  - GET /api/v1/geo/ip-locate     : リクエスト IP から国/都市レベル測位 (~50km)
  - POST /api/v1/geo/wifi-fingerprint : Wi-Fi SSID リスト → 店舗 ID 推定

外部 IP 位置 DB に依存せず、リクエストヘッダ (Cloudflare/Akamai/X-Forwarded-For)
の hint だけ拾う。実際の DB lookup は MaxMind GeoLite2 を mount するなど運用
側で差し替え可能。フェイルセーフは「東京駅」固定 (lat 35.6812, lon 139.7671)。
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_tenant_id
from app.database import get_db
from app.models.store import Store
from app.schemas.common import APIResponse


router = APIRouter(prefix="/api/v1/geo", tags=["geo"])

# 最終フェイルセーフ: 東京駅
_FALLBACK_LAT = 35.6812
_FALLBACK_LON = 139.7671
_IP_ACCURACY_M = 50_000  # ~50km、最終手段


class IpLocateResponse(BaseModel):
    lat: float
    lon: float
    city: Optional[str] = None
    country: Optional[str] = None
    accuracy_m: int = Field(default=_IP_ACCURACY_M)
    source: str = "ip_header_hint"


class WifiFingerprintRequest(BaseModel):
    ssids: list[str] = Field(..., min_length=1, max_length=64)


class WifiFingerprintResponse(BaseModel):
    store_id: Optional[str]
    store_name: Optional[str]
    confidence: float
    accuracy_m: int
    matched_ssids: list[str]


def _read_geo_hint(request: Request) -> tuple[Optional[float], Optional[float], Optional[str], Optional[str]]:
    """Cloudflare / Akamai / Vercel が出すヘッダから粗い緯度経度を拾う。
    取れなければ (None, None, None, None)。
    """
    h = request.headers
    # Cloudflare
    cf_lat = h.get("cf-iplatitude")
    cf_lon = h.get("cf-iplongitude")
    cf_country = h.get("cf-ipcountry")
    cf_city = h.get("cf-ipcity")
    if cf_lat and cf_lon:
        try:
            return float(cf_lat), float(cf_lon), cf_city, cf_country
        except ValueError:
            pass
    # Vercel
    v_lat = h.get("x-vercel-ip-latitude")
    v_lon = h.get("x-vercel-ip-longitude")
    v_country = h.get("x-vercel-ip-country")
    v_city = h.get("x-vercel-ip-city")
    if v_lat and v_lon:
        try:
            return float(v_lat), float(v_lon), v_city, v_country
        except ValueError:
            pass
    return None, None, None, None


@router.get("/ip-locate", response_model=APIResponse[IpLocateResponse])
async def ip_locate(request: Request):
    lat, lon, city, country = _read_geo_hint(request)
    if lat is None or lon is None:
        return APIResponse(data=IpLocateResponse(
            lat=_FALLBACK_LAT, lon=_FALLBACK_LON, city=None, country="JP",
            accuracy_m=_IP_ACCURACY_M, source="fallback_default",
        ))
    return APIResponse(data=IpLocateResponse(
        lat=lat, lon=lon, city=city, country=country,
        accuracy_m=_IP_ACCURACY_M, source="ip_header_hint",
    ))


@router.post("/wifi-fingerprint", response_model=APIResponse[WifiFingerprintResponse])
async def wifi_fingerprint(
    body: WifiFingerprintRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    """Store の name を SSID とゆるくマッチング (前方一致 / 部分一致)。
    本格運用は stores テーブルに wifi_ssids JSONB カラムを足す or
    別 wifi_fingerprints テーブルで管理する想定。MVP は店舗名一致のみ。
    """
    norms = [s.strip().lower() for s in body.ssids if s.strip()]
    if not norms:
        return APIResponse(data=WifiFingerprintResponse(
            store_id=None, store_name=None, confidence=0.0,
            accuracy_m=0, matched_ssids=[],
        ))
    res = await db.execute(select(Store.id, Store.name).limit(500))
    rows = res.all()
    best_id, best_name, best_score = None, None, 0.0
    matched: list[str] = []
    for sid, sname in rows:
        if not sname:
            continue
        n = sname.lower()
        for ssid in norms:
            if ssid == n or ssid in n or n in ssid:
                score = 0.9 if ssid == n else 0.6
                if score > best_score:
                    best_id, best_name, best_score = str(sid), sname, score
                    if ssid not in matched:
                        matched.append(ssid)
    return APIResponse(data=WifiFingerprintResponse(
        store_id=best_id,
        store_name=best_name,
        confidence=round(best_score, 3),
        accuracy_m=30 if best_id else 0,
        matched_ssids=matched,
    ))
