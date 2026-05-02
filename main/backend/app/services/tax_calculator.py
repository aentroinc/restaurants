"""日本の消費税 (軽減税率 8% / 10%) 計算ロジック。

判定ルール (POS データの dining_type と Product.tax_category から):
  - tax_category == "exempt"     -> 0%   (非課税: 商品券等)
  - tax_category == "reduced"    -> 8%   (食品・新聞、または「テイクアウト」「デリバリー」食品)
  - tax_category == "standard"   -> 10%  (酒類・標準商品、または「イートイン」食品)
  - dining_type が takeout/delivery で食品 (reduced) -> 8%
  - dining_type が eat_in (店内飲食) で食品 -> 10% (軽減税率 NG)
  - 酒類 (always_standard フラグ) は dining_type に関わらず 10%

丸め: 1 円未満は四捨五入 (ROUND_HALF_UP)。
内税 (inclusive) / 外税 (exclusive) 切替対応。
"""
from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_sales import DailyStoreSales
from app.models.product import Product
from app.models.product_sales import DailyProductSales
from app.models.sales_tax_breakdown import SalesTaxBreakdown


REDUCED = Decimal("0.08")
STANDARD = Decimal("0.10")
EXEMPT = Decimal("0.00")


def _q(v: Decimal) -> Decimal:
    """円単位で四捨五入。"""
    return v.quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def calculate_tax(
    amount: Decimal | int | float,
    rate: Decimal | float,
    mode: Literal["inclusive", "exclusive"] = "exclusive",
) -> dict[str, Decimal]:
    """消費税を計算する。

    inclusive (内税): amount は税込価格、tax = amount - amount/(1+rate)
    exclusive (外税): amount は税抜価格、tax = amount * rate

    Returns: {"net": 税抜, "tax": 消費税, "gross": 税込}
    """
    a = Decimal(str(amount))
    r = Decimal(str(rate))
    if mode == "inclusive":
        net = _q(a / (Decimal("1") + r))
        tax = a - net
        gross = a
    else:
        net = a
        tax = _q(a * r)
        gross = net + tax
    return {"net": net, "tax": tax, "gross": gross}


def resolve_tax_rate(
    tax_category: str,
    dining_type: str | None = None,
) -> Decimal:
    """商品カテゴリと提供形態から実効税率を決定する。

    軽減税率 (8%) が適用されるのは「食品 (reduced) で持ち帰り or デリバリー」。
    店内飲食 (eat_in) は食品でも 10%。酒類 (standard) は常に 10%。
    """
    cat = (tax_category or "standard").lower()
    if cat == "exempt":
        return EXEMPT
    if cat == "reduced":
        # 食品・新聞: 店内飲食なら 10%、持ち帰り/配達なら 8%。
        if dining_type in ("takeout", "delivery", "to_go"):
            return REDUCED
        if dining_type == "eat_in":
            return STANDARD
        # dining_type 未指定: 食品はデフォルト 8% (テイクアウト基準)
        return REDUCED
    # standard (酒類含む)
    return STANDARD


async def breakdown_daily_sales(
    db: AsyncSession,
    tenant_id: str,
    store_id: str,
    business_date: date,
    *,
    mode: Literal["inclusive", "exclusive"] = "inclusive",
) -> dict[str, dict[str, Decimal]]:
    """日次売上を税率別に分解し SalesTaxBreakdown へ upsert する。

    DailyProductSales の (product, qty, net_sales) を Product.tax_rate と
    DailyStoreSales の dining_in/takeout/delivery 比率で按分。

    Returns: {"0.08": {...}, "0.10": {...}, "0.00": {...}}
    """
    rows = await db.execute(
        select(DailyProductSales, Product)
        .join(Product, Product.id == DailyProductSales.product_id)
        .where(
            DailyProductSales.tenant_id == tenant_id,
            DailyProductSales.store_id == store_id,
            DailyProductSales.business_date == business_date,
        )
    )
    pairs = rows.all()

    daily = await db.execute(
        select(DailyStoreSales).where(
            DailyStoreSales.tenant_id == tenant_id,
            DailyStoreSales.store_id == store_id,
            DailyStoreSales.business_date == business_date,
        )
    )
    daily_row = daily.scalar_one_or_none()

    # dining_type 比率
    eat_in_ratio = Decimal("0.6")  # デフォルト
    takeout_ratio = Decimal("0.3")
    delivery_ratio = Decimal("0.1")
    if daily_row is not None and daily_row.net_sales and daily_row.net_sales > 0:
        total = Decimal(daily_row.net_sales)
        if total > 0:
            eat_in_ratio = Decimal(daily_row.dine_in_sales) / total
            takeout_ratio = Decimal(daily_row.takeout_sales) / total
            delivery_ratio = Decimal(daily_row.delivery_sales) / total

    buckets: dict[Decimal, dict[str, Decimal]] = defaultdict(
        lambda: {"net": Decimal("0"), "tax": Decimal("0"), "tx": Decimal("0")}
    )

    for ps, prod in pairs:
        cat = prod.tax_category or "standard"
        gross = Decimal(ps.net_sales or 0)
        if cat == "reduced":
            # 食品: eat_in 部分は 10%、takeout+delivery 部分は 8%
            ratio_8 = takeout_ratio + delivery_ratio
            ratio_10 = eat_in_ratio
            for rate, ratio in ((REDUCED, ratio_8), (STANDARD, ratio_10)):
                portion = gross * ratio
                if portion <= 0:
                    continue
                t = calculate_tax(portion, rate, mode=mode)
                buckets[rate]["net"] += t["net"]
                buckets[rate]["tax"] += t["tax"]
                buckets[rate]["tx"] += Decimal(ps.quantity or 0) * ratio
        else:
            rate = resolve_tax_rate(cat, None)
            t = calculate_tax(gross, rate, mode=mode)
            buckets[rate]["net"] += t["net"]
            buckets[rate]["tax"] += t["tax"]
            buckets[rate]["tx"] += Decimal(ps.quantity or 0)

    # 既存 breakdown を削除して再投入
    existing = await db.execute(
        select(SalesTaxBreakdown).where(
            SalesTaxBreakdown.tenant_id == tenant_id,
            SalesTaxBreakdown.store_id == store_id,
            SalesTaxBreakdown.business_date == business_date,
        )
    )
    for r in existing.scalars().all():
        await db.delete(r)
    await db.flush()

    out: dict[str, dict[str, Decimal]] = {}
    for rate, vals in buckets.items():
        net = _q(vals["net"])
        tax = _q(vals["tax"])
        tx_count = int(vals["tx"])
        row = SalesTaxBreakdown(
            id=uuid.uuid4(),
            tenant_id=uuid.UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id,
            store_id=uuid.UUID(store_id) if isinstance(store_id, str) else store_id,
            business_date=business_date,
            tax_rate=rate,
            net_sales=net,
            tax_amount=tax,
            transaction_count=tx_count,
        )
        db.add(row)
        out[str(rate)] = {"net_sales": net, "tax_amount": tax, "transaction_count": Decimal(tx_count)}

    # daily_store_sales へ反映
    if daily_row is not None:
        daily_row.net_sales_8pct = buckets.get(REDUCED, {}).get("net", Decimal("0"))
        daily_row.net_sales_10pct = buckets.get(STANDARD, {}).get("net", Decimal("0"))
        daily_row.tax_8pct = buckets.get(REDUCED, {}).get("tax", Decimal("0"))
        daily_row.tax_10pct = buckets.get(STANDARD, {}).get("tax", Decimal("0"))

    return out


async def get_qualified_invoice_summary(
    db: AsyncSession,
    tenant_id: str,
    store_id: str,
    period_start: date,
    period_end: date,
) -> dict:
    """適格請求書 (インボイス) 期間集計。
    税率別の合計 net/tax を返す — 適格請求書発行事業者の月次集計に利用。
    """
    rows = await db.execute(
        select(SalesTaxBreakdown).where(
            SalesTaxBreakdown.tenant_id == tenant_id,
            SalesTaxBreakdown.store_id == store_id,
            SalesTaxBreakdown.business_date >= period_start,
            SalesTaxBreakdown.business_date <= period_end,
        )
    )
    by_rate: dict[str, dict[str, Decimal]] = defaultdict(
        lambda: {"net_sales": Decimal("0"), "tax_amount": Decimal("0"), "transaction_count": 0}
    )
    for r in rows.scalars().all():
        key = str(r.tax_rate)
        by_rate[key]["net_sales"] += Decimal(r.net_sales or 0)
        by_rate[key]["tax_amount"] += Decimal(r.tax_amount or 0)
        by_rate[key]["transaction_count"] += int(r.transaction_count or 0)

    total_net = sum((v["net_sales"] for v in by_rate.values()), Decimal("0"))
    total_tax = sum((v["tax_amount"] for v in by_rate.values()), Decimal("0"))
    return {
        "period": {"start": period_start.isoformat(), "end": period_end.isoformat()},
        "by_rate": {k: {kk: (str(vv) if isinstance(vv, Decimal) else vv) for kk, vv in v.items()} for k, v in by_rate.items()},
        "total_net_sales": str(total_net),
        "total_tax_amount": str(total_tax),
        "total_gross": str(total_net + total_tax),
    }
