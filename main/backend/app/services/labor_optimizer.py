"""
予測客数 → 必要FTE。labor_standards.json の brand×slot テーブルを参照。

FTE = 同時稼働人時 (per 30分slot)
役割比率は labor_standards.json の role_split に従う (ホール/キッチン/レジ)。
"""
from __future__ import annotations
import json
import math
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from app.services.demand_forecaster import SlotPrediction

_STANDARDS_PATH = Path(__file__).parent / "labor_standards.json"
_STANDARDS_CACHE: dict | None = None


def load_standards() -> dict:
    global _STANDARDS_CACHE
    if _STANDARDS_CACHE is None:
        with _STANDARDS_PATH.open("r", encoding="utf-8") as f:
            _STANDARDS_CACHE = json.load(f)
    return _STANDARDS_CACHE


def _resolve_brand_cfg(standards: dict, brand_name: str | None) -> dict:
    default = standards["default"]
    if not brand_name:
        return default
    brand = standards.get("brands", {}).get(brand_name)
    if not brand:
        return default
    merged = dict(default)
    merged.update({k: v for k, v in brand.items() if k != "slot_overrides"})
    merged["slot_overrides"] = brand.get("slot_overrides", {})
    return merged


def _slot_key(dt: datetime) -> str:
    return f"{dt.hour:02d}:{dt.minute:02d}"


@dataclass
class Requirement:
    slot_start: datetime
    required_fte: float
    role_split: dict  # {"ホール": 1.5, "キッチン": 2.0, "レジ": 0.5}
    hourly_wage_yen: int


def compute_requirements(
    forecast: Iterable[SlotPrediction],
    brand_name: str | None = None,
) -> list[Requirement]:
    standards = load_standards()
    cfg = _resolve_brand_cfg(standards, brand_name)
    out: list[Requirement] = []
    overrides = cfg.get("slot_overrides", {})
    for sp in forecast:
        slot_cfg = overrides.get(_slot_key(sp.slot_start), {})
        per_fte = float(slot_cfg.get("customers_per_fte_per_30m", cfg["customers_per_fte_per_30m"]))
        min_fte = float(cfg.get("min_fte", 1.0))
        raw = sp.predicted_customers / max(per_fte, 0.1)
        # 0.5刻みで切り上げ
        fte = max(min_fte, math.ceil(raw * 2) / 2.0)
        split = {role: round(fte * ratio, 2) for role, ratio in cfg["role_split"].items()}
        out.append(Requirement(
            slot_start=sp.slot_start,
            required_fte=fte,
            role_split=split,
            hourly_wage_yen=int(cfg["hourly_wage_yen"]),
        ))
    return out


def estimate_cost(requirements: Iterable[Requirement]) -> int:
    """合計シフトコスト (1slot=0.5h)。"""
    total = 0.0
    for r in requirements:
        total += r.required_fte * 0.5 * r.hourly_wage_yen
    return int(total)
