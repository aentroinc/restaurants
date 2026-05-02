"""Huff gravity model for trade area / site selection analysis."""
import math
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trade_area import CompetitorStore, PopulationMesh
from app.models.store import Store


def haversine(lat1, lon1, lat2, lon2) -> float:
    """Distance between two points in meters."""
    R = 6371000
    dlat = math.radians(float(lat2) - float(lat1))
    dlon = math.radians(float(lon2) - float(lon1))
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(float(lat1))) *
         math.cos(math.radians(float(lat2))) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def predict_huff(
    session: AsyncSession,
    tenant_id: str,
    candidate_lat: float,
    candidate_lon: float,
    candidate_attractiveness: float = 1.0,
    beta: float = 2.0,
    max_radius_km: float = 5.0,
) -> dict:
    """Predict visit probability and revenue for a candidate location using Huff model."""
    max_radius_m = max_radius_km * 1000

    # Get population meshes (filter rough bounding box first)
    lat_delta = max_radius_km / 111.0
    lon_delta = max_radius_km / (111.0 * math.cos(math.radians(candidate_lat)))

    mesh_result = await session.execute(
        select(PopulationMesh).where(
            PopulationMesh.lat.between(candidate_lat - lat_delta, candidate_lat + lat_delta),
            PopulationMesh.lon.between(candidate_lon - lon_delta, candidate_lon + lon_delta),
        )
    )
    meshes = mesh_result.scalars().all()

    # Filter by actual distance
    nearby_meshes = []
    for m in meshes:
        d = haversine(candidate_lat, candidate_lon, float(m.lat), float(m.lon))
        if d <= max_radius_m:
            nearby_meshes.append((m, d))

    # Get own stores within radius
    own_result = await session.execute(
        select(Store).where(
            Store.tenant_id == tenant_id,
            Store.status == "active",
            Store.lat.isnot(None),
        )
    )
    own_stores = []
    for s in own_result.scalars().all():
        d = haversine(candidate_lat, candidate_lon, s.lat, s.lng)
        if d <= max_radius_m:
            own_stores.append((s, d))

    # Get competitor stores within radius
    comp_result = await session.execute(
        select(CompetitorStore).where(
            CompetitorStore.tenant_id == tenant_id,
        )
    )
    competitors = []
    for c in comp_result.scalars().all():
        d = haversine(candidate_lat, candidate_lon, float(c.lat), float(c.lon))
        if d <= max_radius_m:
            competitors.append((c, d))

    # Calculate Huff probabilities per mesh
    VISIT_FREQ = 0.03  # visits per person per month
    total_visits = 0.0
    by_mesh = []
    cannibalization_visits = 0.0

    for m, d_candidate in nearby_meshes:
        if d_candidate < 50:
            d_candidate = 50  # minimum distance to avoid division issues

        # Candidate attractiveness contribution
        candidate_term = candidate_attractiveness / (d_candidate ** beta)
        total_attractiveness = candidate_term

        # Own stores
        for s, _ in own_stores:
            d_s = haversine(float(m.lat), float(m.lon), s.lat, s.lng)
            if d_s < 50:
                d_s = 50
            total_attractiveness += 1.0 / (d_s ** beta)

        # Competitors
        for c, _ in competitors:
            d_c = haversine(float(m.lat), float(m.lon), float(c.lat), float(c.lon))
            if d_c < 50:
                d_c = 50
            total_attractiveness += 0.8 / (d_c ** beta)

        p_candidate = candidate_term / total_attractiveness if total_attractiveness > 0 else 0
        visits = m.daytime_population * p_candidate * VISIT_FREQ
        total_visits += visits

        by_mesh.append({
            "mesh": m.mesh_code,
            "prob": round(p_candidate, 4),
            "visits": round(visits, 1),
        })

    # Estimate cannibalization from own stores
    for s, d_own in own_stores:
        if d_own < 2000:
            cannibalization_visits += total_visits * max(0, (2000 - d_own) / 2000) * 0.3

    cannibalization_pct = (cannibalization_visits / total_visits * 100) if total_visits > 0 else 0

    avg_ticket = 800  # default average ticket estimate
    monthly_revenue = total_visits * avg_ticket
    first_year_revenue = monthly_revenue * 12 * 0.7  # ramp-up factor

    return {
        "total_monthly_visits": round(total_visits, 0),
        "monthly_revenue_estimate_jpy": round(monthly_revenue, 0),
        "first_year_revenue_estimate_jpy": round(first_year_revenue, 0),
        "cannibalization_pct": round(cannibalization_pct, 1),
        "competitive_density": len(competitors),
        "own_stores_nearby": len(own_stores),
        "meshes_analyzed": len(nearby_meshes),
        "by_mesh": by_mesh[:50],  # limit response size
    }
