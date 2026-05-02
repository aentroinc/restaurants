from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.auth import get_tenant_id
from app.models.supply_chain import Factory, DistributionCenter, DeliveryRoute
from app.schemas.common import APIResponse
from app.schemas.supply_chain import (
    FactoryRead,
    DCRead,
    RouteRead,
    NetworkGraphResponse,
    NetworkNode,
    NetworkEdge,
    ScenarioOption,
)

router = APIRouter(prefix="/api/v1/supply-chain", tags=["supply-chain"])


# Pre-defined scenario templates per incident type
SCENARIO_TEMPLATES: dict[str, list[dict]] = {
    "weather-delay": [
        {
            "label": "A",
            "description": "代替DCからの緊急配送に切替（東京DC → 名古屋DC経由）",
            "pros": ["欠品リスクを最小化", "店舗在庫を24h以内に補充"],
            "cons": ["輸送コスト +18%", "他エリアの配送が後回しに"],
            "expected_impact": [
                {"metric": "欠品店舗数", "value": -12, "unit": "店舗"},
                {"metric": "追加コスト", "value": 850000, "unit": "円"},
            ],
            "confidence": "High",
            "risk": "Low",
            "recommended": True,
        },
        {
            "label": "B",
            "description": "出荷を優先順位付け（高売上店舗のみ通常配送、他は翌日に延期）",
            "pros": ["コスト増を抑制", "オペ負荷が小さい"],
            "cons": ["低売上店舗で欠品発生", "顧客満足度に影響"],
            "expected_impact": [
                {"metric": "欠品店舗数", "value": -3, "unit": "店舗"},
                {"metric": "追加コスト", "value": 120000, "unit": "円"},
            ],
            "confidence": "Medium",
            "risk": "Medium",
            "recommended": False,
        },
        {
            "label": "C",
            "description": "近隣店舗間で在庫融通（店舗間横持ち）",
            "pros": ["全社コストはほぼ変わらず", "DC負荷ゼロ"],
            "cons": ["店舗オペ負荷大", "数量が限定的"],
            "expected_impact": [
                {"metric": "欠品店舗数", "value": -6, "unit": "店舗"},
                {"metric": "追加コスト", "value": 50000, "unit": "円"},
            ],
            "confidence": "Medium",
            "risk": "High",
            "recommended": False,
        },
    ],
    "demand-surge": [
        {
            "label": "A",
            "description": "工場稼働を緊急増（深夜シフト追加）",
            "pros": ["需要に確実に対応", "売上機会ロスを防止"],
            "cons": ["人件費 +25%", "工場負荷が高い"],
            "expected_impact": [
                {"metric": "売上機会ロス削減", "value": 4200000, "unit": "円"},
                {"metric": "追加コスト", "value": 980000, "unit": "円"},
            ],
            "confidence": "High",
            "risk": "Low",
            "recommended": True,
        },
        {
            "label": "B",
            "description": "限定SKUのみ増産、他は通常生産維持",
            "pros": ["主要SKUの欠品防止", "コスト増を限定"],
            "cons": ["副次SKUは欠品リスク残存"],
            "expected_impact": [
                {"metric": "売上機会ロス削減", "value": 2800000, "unit": "円"},
                {"metric": "追加コスト", "value": 450000, "unit": "円"},
            ],
            "confidence": "High",
            "risk": "Medium",
            "recommended": False,
        },
        {
            "label": "C",
            "description": "外部委託で短期増産",
            "pros": ["自社工場負荷ゼロ"],
            "cons": ["品質バラつきリスク", "コストが最も高い"],
            "expected_impact": [
                {"metric": "売上機会ロス削減", "value": 3500000, "unit": "円"},
                {"metric": "追加コスト", "value": 1500000, "unit": "円"},
            ],
            "confidence": "Medium",
            "risk": "High",
            "recommended": False,
        },
    ],
    "stockout-risk": [
        {
            "label": "A",
            "description": "緊急発注で在庫を48h以内に補充",
            "pros": ["欠品ゼロ実現", "顧客満足度維持"],
            "cons": ["緊急発注コスト +12%"],
            "expected_impact": [
                {"metric": "欠品店舗数", "value": -8, "unit": "店舗"},
                {"metric": "追加コスト", "value": 320000, "unit": "円"},
            ],
            "confidence": "High",
            "risk": "Low",
            "recommended": True,
        },
        {
            "label": "B",
            "description": "代替SKUへの誘導 (POP・店頭メニュー差し替え)",
            "pros": ["コスト最小", "在庫を有効活用"],
            "cons": ["客単価が下がる可能性"],
            "expected_impact": [
                {"metric": "欠品店舗数", "value": -5, "unit": "店舗"},
                {"metric": "客単価影響", "value": -3, "unit": "%"},
            ],
            "confidence": "Medium",
            "risk": "Medium",
            "recommended": False,
        },
        {
            "label": "C",
            "description": "店舗別の優先配分（売上順）",
            "pros": ["主力店舗を守る"],
            "cons": ["小型店で完全欠品"],
            "expected_impact": [
                {"metric": "欠品店舗数", "value": -3, "unit": "店舗"},
                {"metric": "追加コスト", "value": 0, "unit": "円"},
            ],
            "confidence": "Medium",
            "risk": "High",
            "recommended": False,
        },
    ],
}


@router.get("/factories", response_model=APIResponse[list[FactoryRead]])
async def list_factories(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    try:
        result = await db.execute(select(Factory).where(Factory.tenant_id == tenant_id))
        rows = result.scalars().all()
    except Exception:
        rows = []
    return APIResponse(data=[FactoryRead.model_validate(r) for r in rows])


@router.get("/distribution-centers", response_model=APIResponse[list[DCRead]])
async def list_dcs(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    try:
        result = await db.execute(
            select(DistributionCenter).where(DistributionCenter.tenant_id == tenant_id)
        )
        rows = result.scalars().all()
    except Exception:
        rows = []
    return APIResponse(data=[DCRead.model_validate(r) for r in rows])


@router.get("/routes", response_model=APIResponse[list[RouteRead]])
async def list_routes(
    status: str | None = Query(None),
    region: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    q = select(DeliveryRoute).where(DeliveryRoute.tenant_id == tenant_id)
    if status:
        q = q.where(DeliveryRoute.status == status)
    if region:
        q = q.where(DeliveryRoute.destination_area == region)
    try:
        result = await db.execute(q)
        rows = result.scalars().all()
    except Exception:
        rows = []
    return APIResponse(data=[RouteRead.model_validate(r) for r in rows])


@router.get("/network", response_model=APIResponse[NetworkGraphResponse])
async def get_network(
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    nodes: list[NetworkNode] = []
    edges: list[NetworkEdge] = []

    try:
        f_res = await db.execute(select(Factory).where(Factory.tenant_id == tenant_id))
        factories = f_res.scalars().all()
    except Exception:
        factories = []

    try:
        dc_res = await db.execute(
            select(DistributionCenter).where(DistributionCenter.tenant_id == tenant_id)
        )
        dcs = dc_res.scalars().all()
    except Exception:
        dcs = []

    try:
        r_res = await db.execute(select(DeliveryRoute).where(DeliveryRoute.tenant_id == tenant_id))
        routes = r_res.scalars().all()
    except Exception:
        routes = []

    for f in factories:
        nodes.append(
            NetworkNode(
                id=f"factory:{f.id}",
                type="factory",
                label=f.name,
                region=f.region,
                lat=f.lat,
                lng=f.lng,
                metrics={
                    "capacity_tons_day": f.capacity_tons_day,
                    "utilization_pct": f.utilization_pct,
                    "status": f.status,
                },
            )
        )

    for dc in dcs:
        nodes.append(
            NetworkNode(
                id=f"dc:{dc.id}",
                type="dc",
                label=dc.name,
                region=dc.region,
                lat=dc.lat,
                lng=dc.lng,
                metrics={
                    "throughput_capacity_tons_day": dc.throughput_capacity_tons_day,
                    "current_throughput": dc.current_throughput,
                    "status": dc.status,
                },
            )
        )

    # store-cluster nodes by destination_area (aggregated)
    cluster_seen: set[str] = set()
    for r in routes:
        area = r.destination_area or "未設定"
        cluster_id = f"cluster:{area}"
        if cluster_id not in cluster_seen:
            store_count = len(r.destination_store_ids or [])
            nodes.append(
                NetworkNode(
                    id=cluster_id,
                    type="store-cluster",
                    label=f"{area}店舗群",
                    region=area,
                    metrics={"store_count": store_count},
                )
            )
            cluster_seen.add(cluster_id)

        if r.origin_dc_id:
            edges.append(
                NetworkEdge(
                    id=f"route:{r.id}",
                    source=f"dc:{r.origin_dc_id}",
                    target=cluster_id,
                    type="delivery",
                    status=r.status,
                    load_pct=r.load_pct,
                    delay_minutes=r.delay_minutes,
                )
            )

    # factory -> dc supply edges (heuristic: same region first, else first dc)
    for f in factories:
        target_dc = next((d for d in dcs if d.region == f.region), None)
        if not target_dc and dcs:
            target_dc = dcs[0]
        if target_dc:
            edges.append(
                NetworkEdge(
                    id=f"supply:{f.id}-{target_dc.id}",
                    source=f"factory:{f.id}",
                    target=f"dc:{target_dc.id}",
                    type="supply",
                    status="on-time",
                )
            )

    return APIResponse(data=NetworkGraphResponse(nodes=nodes, edges=edges))


@router.get("/scenarios", response_model=APIResponse[list[ScenarioOption]])
async def get_scenarios(
    incident_type: str = Query(..., description="incident type e.g. weather-delay"),
):
    templates = SCENARIO_TEMPLATES.get(incident_type, [])
    return APIResponse(data=[ScenarioOption(**t) for t in templates], meta={"incident_type": incident_type})
