from fastapi import APIRouter, Depends, Query, Path, Body
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID, uuid4
from datetime import datetime
from app.database import get_db
from app.schemas.common import APIResponse, PaginationMeta

router = APIRouter(prefix="/api/v1/writeback", tags=["writeback"])

WRITEBACK_POLICIES = [
    {
        "id": "40000000-0000-0000-0000-000000000001",
        "action": "task_create",
        "display_name": "タスク作成",
        "description": "AI分析結果に基づく改善タスクの自動作成",
        "requires_approval": True,
        "approver_role": "area_manager",
        "auto_execute": False,
        "cooldown_minutes": 60,
        "max_per_day": 10,
        "enabled": True,
    },
    {
        "id": "40000000-0000-0000-0000-000000000002",
        "action": "meeting_item_add",
        "display_name": "会議アジェンダ追加",
        "description": "取締役会・エリア会議のアジェンダ項目を自動追加",
        "requires_approval": False,
        "approver_role": None,
        "auto_execute": True,
        "cooldown_minutes": 0,
        "max_per_day": 50,
        "enabled": True,
    },
    {
        "id": "40000000-0000-0000-0000-000000000003",
        "action": "sv_mission_create",
        "display_name": "SVミッション作成",
        "description": "SV訪問時の重点確認ミッションを自動生成",
        "requires_approval": True,
        "approver_role": "regional_manager",
        "auto_execute": False,
        "cooldown_minutes": 120,
        "max_per_day": 5,
        "enabled": True,
    },
    {
        "id": "40000000-0000-0000-0000-000000000004",
        "action": "alert_send",
        "display_name": "アラート送信",
        "description": "KPI閾値超過時のアラート通知（Slack/メール）",
        "requires_approval": False,
        "approver_role": None,
        "auto_execute": True,
        "cooldown_minutes": 30,
        "max_per_day": 100,
        "enabled": True,
    },
    {
        "id": "40000000-0000-0000-0000-000000000005",
        "action": "order_suggestion",
        "display_name": "発注提案",
        "description": "在庫・売上予測に基づく発注量の提案作成",
        "requires_approval": True,
        "approver_role": "store_manager",
        "auto_execute": False,
        "cooldown_minutes": 1440,
        "max_per_day": 1,
        "enabled": True,
    },
    {
        "id": "40000000-0000-0000-0000-000000000006",
        "action": "shift_optimization",
        "display_name": "シフト最適化提案",
        "description": "人時売上に基づくシフト調整の提案",
        "requires_approval": True,
        "approver_role": "store_manager",
        "auto_execute": False,
        "cooldown_minutes": 1440,
        "max_per_day": 1,
        "enabled": False,
    },
]

_writeback_requests: list[dict] = [
    {
        "id": "50000000-0000-0000-0000-000000000001",
        "policy_action": "task_create",
        "display_name": "松屋 新宿東口店: 原価率改善タスク作成",
        "requested_by": "ai_engine",
        "requested_at": "2026-04-30T06:35:00+09:00",
        "status": "pending",
        "payload": {"store_id": "store-001", "title": "食材ロス削減（4月度原価率2.1%超過）", "issue_type": "cogs", "priority": "high"},
        "approved_by": None,
        "approved_at": None,
        "executed_at": None,
        "result": None,
    },
    {
        "id": "50000000-0000-0000-0000-000000000002",
        "policy_action": "sv_mission_create",
        "display_name": "松屋 渋谷センター街店: SV重点チェックミッション",
        "requested_by": "ai_engine",
        "requested_at": "2026-04-30T06:40:00+09:00",
        "status": "approved",
        "payload": {"store_id": "store-005", "mission": "衛生管理・食材保管状況の重点確認", "due_date": "2026-05-07"},
        "approved_by": "リージョナルMGR 田中",
        "approved_at": "2026-04-30T09:15:00+09:00",
        "executed_at": None,
        "result": None,
    },
    {
        "id": "50000000-0000-0000-0000-000000000003",
        "policy_action": "meeting_item_add",
        "display_name": "5月度取締役会: FL比率改善進捗レポート追加",
        "requested_by": "ai_engine",
        "requested_at": "2026-04-29T18:00:00+09:00",
        "status": "executed",
        "payload": {"meeting_type": "board", "item_title": "FL比率改善進捗（4月度実績）"},
        "approved_by": None,
        "approved_at": None,
        "executed_at": "2026-04-29T18:00:05+09:00",
        "result": {"success": True, "meeting_pack_id": "mp-2026-05"},
    },
]


@router.get("/policies", response_model=APIResponse[list[dict]])
async def list_policies(db: AsyncSession = Depends(get_db)):
    return APIResponse(data=WRITEBACK_POLICIES, meta={"total": len(WRITEBACK_POLICIES)})


@router.get("/requests", response_model=APIResponse[list[dict]])
async def list_requests(
    status: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    data = _writeback_requests
    if status:
        data = [r for r in data if r["status"] == status]
    total = len(data)
    start = (page - 1) * page_size
    page_data = data[start:start + page_size]
    meta = PaginationMeta(total=total, page=page, page_size=page_size, total_pages=max(1, (total + page_size - 1) // page_size))
    return APIResponse(data=page_data, meta=meta.model_dump())


@router.post("/requests", response_model=APIResponse[dict])
async def create_request(body: dict = Body(...), db: AsyncSession = Depends(get_db)):
    new_req = {
        "id": str(uuid4()),
        "policy_action": body.get("policy_action", "task_create"),
        "display_name": body.get("display_name", "新規リクエスト"),
        "requested_by": body.get("requested_by", "user"),
        "requested_at": datetime.now().isoformat(),
        "status": "pending",
        "payload": body.get("payload", {}),
        "approved_by": None,
        "approved_at": None,
        "executed_at": None,
        "result": None,
    }
    _writeback_requests.insert(0, new_req)
    return APIResponse(data=new_req)


@router.post("/requests/{request_id}/approve", response_model=APIResponse[dict])
async def approve_request(request_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    for r in _writeback_requests:
        if r["id"] == request_id:
            r["status"] = "approved"
            r["approved_by"] = "管理者"
            r["approved_at"] = datetime.now().isoformat()
            return APIResponse(data=r)
    return APIResponse(errors=[{"detail": "Request not found"}])


@router.post("/requests/{request_id}/execute", response_model=APIResponse[dict])
async def execute_request(request_id: str = Path(...), db: AsyncSession = Depends(get_db)):
    for r in _writeback_requests:
        if r["id"] == request_id:
            r["status"] = "executed"
            r["executed_at"] = datetime.now().isoformat()
            r["result"] = {"success": True, "message": "正常に実行されました"}
            return APIResponse(data=r)
    return APIResponse(errors=[{"detail": "Request not found"}])
