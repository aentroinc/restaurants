import numpy as np
from decimal import Decimal


def group_key(brand_id: str, trade_area_type: str) -> str:
    return f"{brand_id}:{trade_area_type}"


def calculate_percentiles(values: list[float], percentiles: list[int] = None) -> dict:
    if not values:
        return {}
    if percentiles is None:
        percentiles = [25, 50, 75, 90]
    arr = np.array(values)
    return {f"p{p}": round(float(np.percentile(arr, p)), 2) for p in percentiles}


def calculate_peer_medians(stores_data: list[dict]) -> dict[str, dict]:
    """Group stores by brand + trade_area_type, return medians for each KPI."""
    groups: dict[str, list[dict]] = {}
    for s in stores_data:
        key = group_key(str(s.get("brand_id", "")), s.get("trade_area_type", ""))
        groups.setdefault(key, []).append(s)

    result = {}
    metrics = ["cogs_rate", "labor_cost_rate", "fl_ratio", "avg_ticket", "sales_per_labor_hour"]

    for key, stores in groups.items():
        medians = {}
        for metric in metrics:
            vals = [float(s[metric]) for s in stores if s.get(metric) is not None]
            if vals:
                medians[metric] = round(float(np.median(vals)), 2)
        result[key] = medians

    return result


def store_percentile_in_peer(store_value: float, peer_values: list[float]) -> float:
    """Return the percentile rank of store_value within peer_values."""
    if not peer_values:
        return 50.0
    arr = np.array(peer_values)
    return round(float(np.sum(arr <= store_value) / len(arr) * 100), 1)
