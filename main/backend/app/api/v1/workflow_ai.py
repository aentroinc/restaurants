"""自然言語 → workflow spec 生成 (Claude tool use)"""
import json
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_tenant_id
from app.services.ai.client import get_client, is_llm_available

router = APIRouter(prefix="/api/v1/workflow-ai", tags=["workflow-ai"])


GEN_SYSTEM = """あなたは外食チェーン経営支援システムの Workflow 生成 AI です。
日本語の業務ルールを受け取り、実行可能な workflow spec を JSON で返します。

## 利用可能な KPI フィールド (subset)
- waste_amount, waste_amount_wow_pct (廃棄)
- stockout_rate, stockout_count (欠品)
- gross_profit_rate, net_sales (粗利・売上)
- labor_cost_rate, labor_cost_rate_night (人件費)
- sales_per_labor_hour (人時売上)
- health_score (店舗健康度)
- qsc_score, haccp_compliance_rate (品質)
- inventory_days_remaining (在庫日数)
- ccp_deviation_count (HACCP 温度逸脱)
- repeat_rate, review_score (リピート / 口コミ)

## アクション type
- create_sv_mission: SV 訪問計画
- create_task: 改善タスク起票
- slack_notify: Slack 通知
- slack_alert: Slack 緊急通知
- create_replenishment: 補充指示
- create_action: 任意のアクション

## 必ず返す JSON (text 出力ではなく純 JSON):
{
  "trigger": {
    "type": "kpi_threshold | inventory_threshold | haccp_deviation",
    "condition": "<KPIフィールド> <比較演算子> <閾値>",
    "threshold": "+20% など人間可読",
    "window": "前週比 / 日次 / リアルタイム など"
  },
  "filter": { "brand": "...", "region": "...", "storeCount": "..." },
  "action": {
    "type": "<上記から>",
    "target": "<対象 role/組織>",
    "description": "<日本語の具体内容>"
  },
  "estimated_value": "<効果見積もり（円換算）>",
  "enabled": true
}
"""


class GenerateRequest(BaseModel):
    nl: str


@router.post("/generate")
async def generate_workflow(
    body: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: str = Depends(get_tenant_id),
):
    if not is_llm_available():
        return {"data": _fallback_pattern_match(body.nl), "source": "pattern_match"}

    client = get_client()
    try:
        resp = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=GEN_SYSTEM,
            messages=[
                {"role": "user", "content": f"次の日本語ルールを workflow spec JSON に変換してください。JSON のみで返答:\n\n{body.nl}"}
            ],
        )
        try:
            from app.middleware.metrics import record_ai_tokens
            record_ai_tokens(
                "claude-sonnet-4-20250514",
                getattr(resp.usage, "input_tokens", 0) or 0,
                getattr(resp.usage, "output_tokens", 0) or 0,
            )
        except Exception:
            pass
        text = ""
        for block in resp.content:
            if block.type == "text":
                text += block.text

        # JSON 抽出
        json_match = re.search(r"\{[\s\S]*\}", text)
        if json_match:
            spec = json.loads(json_match.group(0))
            return {"data": spec, "source": "claude", "tokens": resp.usage.input_tokens + resp.usage.output_tokens}
    except Exception as e:
        return {"data": _fallback_pattern_match(body.nl), "source": "fallback", "error": str(e)}

    return {"data": _fallback_pattern_match(body.nl), "source": "pattern_match"}


def _fallback_pattern_match(nl: str) -> dict:
    lower = nl.lower()
    if "廃棄" in lower or "waste" in lower:
        return {
            "trigger": {"type": "kpi_threshold", "condition": "waste_amount_wow_pct > 20", "threshold": "+20%", "window": "前週比"},
            "action": {"type": "create_sv_mission", "target": "エリアマネージャ", "description": "緊急訪問・廃棄削減対応"},
            "enabled": True,
            "estimated_value": "年間 ¥4.8M / 検出店舗",
        }
    if "haccp" in lower or "温度" in lower:
        return {
            "trigger": {"type": "haccp_deviation", "condition": "ccp_deviation_count >= 3", "threshold": "連続3回", "window": "1日"},
            "action": {"type": "slack_notify", "target": "店長", "description": "HACCP 温度管理 緊急対応依頼"},
            "enabled": True,
            "estimated_value": "食品事故リスク回避",
        }
    if "health" in lower or "ヘルス" in lower or "score" in lower:
        return {
            "trigger": {"type": "kpi_threshold", "condition": "health_score < 60", "threshold": "60 未満", "window": "日次"},
            "action": {"type": "create_task", "target": "店長", "description": "店舗改善計画の起票"},
            "enabled": True,
            "estimated_value": "年間 ¥1.5M / 店舗",
        }
    if "欠品" in lower or "在庫" in lower or "stockout" in lower:
        return {
            "trigger": {"type": "inventory_threshold", "condition": "stockout_risk > 0.7", "threshold": "70%", "window": "リアルタイム"},
            "action": {"type": "create_replenishment", "target": "本部 SCM", "description": "前倒し補充指示"},
            "enabled": True,
            "estimated_value": "年間 ¥3.2M / 検出店舗",
        }
    return {
        "trigger": {"type": "kpi_threshold", "condition": "(条件を AI が解析中)", "threshold": "?", "window": "日次"},
        "action": {"type": "notify", "target": "担当者", "description": "(AI が解析中)"},
        "enabled": True,
    }
