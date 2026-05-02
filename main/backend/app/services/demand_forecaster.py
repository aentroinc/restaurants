"""
30分slot粒度の客数予測。実モデル不要、ヒューリスティクスで動く。

ロジック:
  - 過去同曜日 (4週ぶん) の同時刻30分slotの客数中央値をベースライン
  - 天気係数: sunny=1.05, cloudy=1.00, rainy=0.85, storm=0.65
  - イベント係数: holiday=1.15, payday=1.08, none=1.00
  - トレンド係数: 直近4週のYoY的なドリフト (ここでは固定 1.02)
  - 月齢係数: lunar の影響は飲食店にはほぼないので 1.00 だが factors_json には含める
"""
from __future__ import annotations
import statistics
from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Iterable
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hourly_sales import HourlyStoreSales

WEATHER_COEFF = {"sunny": 1.05, "cloudy": 1.00, "rainy": 0.85, "storm": 0.65}
EVENT_COEFF = {"holiday": 1.15, "payday": 1.08, "campaign": 1.10, "none": 1.00}
TREND_COEFF = 1.02

# 30分単位の店内ピーク係数 (時間帯による分布)
HOUR_TO_30M_DIST = {
    11: (0.45, 0.55), 12: (0.55, 0.45), 13: (0.60, 0.40),
    18: (0.45, 0.55), 19: (0.55, 0.45), 20: (0.60, 0.40),
}


@dataclass
class SlotPrediction:
    slot_start: datetime
    predicted_customers: float
    predicted_sales: float
    confidence: float
    factors: dict


def _pseudo_weather(d: date) -> str:
    """合成データで決定論的な天気を返す (date から hash)。"""
    h = (d.toordinal() * 31) % 100
    if h < 8:
        return "storm"
    if h < 28:
        return "rainy"
    if h < 60:
        return "cloudy"
    return "sunny"


def _pseudo_event(d: date) -> str:
    if d.day == 25:
        return "payday"
    if d.weekday() >= 5:
        return "holiday"
    if d.day in (5, 15):
        return "campaign"
    return "none"


def _split_hour_into_slots(hour: int) -> tuple[float, float]:
    return HOUR_TO_30M_DIST.get(hour, (0.5, 0.5))


async def _historical_hourly_by_dow(
    db: AsyncSession,
    tenant_id: str,
    store_id: UUID,
    target_date: date,
    lookback_weeks: int = 4,
) -> dict[int, list[tuple[int, int]]]:
    """同曜日の過去 lookback_weeks 週ぶんの (hour, customer_count, net_sales) を返す。"""
    starts = [target_date - timedelta(weeks=i + 1) for i in range(lookback_weeks)]
    q = select(HourlyStoreSales).where(and_(
        HourlyStoreSales.tenant_id == tenant_id,
        HourlyStoreSales.store_id == store_id,
        HourlyStoreSales.business_date.in_(starts),
    ))
    rows = (await db.execute(q)).scalars().all()
    bucket: dict[int, list[tuple[int, int]]] = defaultdict(list)
    for r in rows:
        bucket[r.hour].append((int(r.customer_count or 0), int(r.net_sales or 0)))
    return bucket


def _operating_hours() -> Iterable[int]:
    """営業時間（合成データなので 10:00-22:00 をカバー）。"""
    return range(10, 23)


async def predict(
    db: AsyncSession,
    tenant_id: str,
    store_id: UUID,
    date_from: date,
    date_to: date,
) -> list[SlotPrediction]:
    """
    [date_from, date_to] (両端含む) を 30分slotで予測。
    """
    out: list[SlotPrediction] = []
    cur = date_from
    while cur <= date_to:
        hist = await _historical_hourly_by_dow(db, tenant_id, store_id, cur)
        weather = _pseudo_weather(cur)
        event = _pseudo_event(cur)
        weather_c = WEATHER_COEFF.get(weather, 1.0)
        event_c = EVENT_COEFF.get(event, 1.0)
        lunar = (cur.toordinal() % 30) / 30.0  # 0..1

        for hour in _operating_hours():
            samples = hist.get(hour, [])
            if samples:
                cust_med = statistics.median(s[0] for s in samples)
                sales_med = statistics.median(s[1] for s in samples)
            else:
                # フォールバック (時間帯ピーク)
                if hour in (12, 13, 19, 20):
                    cust_med, sales_med = 32.0, 22000.0
                elif hour in (11, 18):
                    cust_med, sales_med = 18.0, 12500.0
                else:
                    cust_med, sales_med = 8.0, 5500.0

            half1, half2 = _split_hour_into_slots(hour)
            adj = weather_c * event_c * TREND_COEFF
            for idx, share in enumerate((half1, half2)):
                slot_start = datetime.combine(cur, time(hour=hour, minute=30 * idx), tzinfo=timezone.utc)
                pc = cust_med * share * adj
                ps = sales_med * share * adj
                # 信頼度: サンプル数が多いほど高く、悪天候で下がる
                conf = 0.55 + min(0.30, 0.075 * len(samples)) + (0.05 if weather == "sunny" else 0.0)
                conf = round(min(0.95, conf), 2)
                out.append(SlotPrediction(
                    slot_start=slot_start,
                    predicted_customers=round(pc, 2),
                    predicted_sales=round(ps, 0),
                    confidence=conf,
                    factors={
                        "weather": weather,
                        "weather_coeff": weather_c,
                        "event": event,
                        "event_coeff": event_c,
                        "dow": cur.weekday(),
                        "trend_coeff": TREND_COEFF,
                        "lunar": round(lunar, 3),
                        "hist_samples": len(samples),
                    },
                ))
        cur += timedelta(days=1)
    return out


def to_decimal(v: float) -> Decimal:
    return Decimal(str(v))
