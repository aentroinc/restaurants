import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import select, and_, func as sqlfunc, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.franchise import FranchiseAgreement, FranchiseRoyaltyCalc
from app.models.daily_sales import DailyStoreSales


async def calculate_monthly_royalties(
    db: AsyncSession, tenant_id: str, year: int, month: int
) -> list[dict]:
    agreements_q = await db.execute(
        select(FranchiseAgreement).where(
            and_(
                FranchiseAgreement.tenant_id == tenant_id,
                FranchiseAgreement.agreement_type == "franchise",
                FranchiseAgreement.effective_from <= date(year, month, 1),
            )
        )
    )
    agreements = agreements_q.scalars().all()

    results = []
    for agr in agreements:
        if agr.effective_to and agr.effective_to < date(year, month, 1):
            continue

        sales_q = await db.execute(
            select(sqlfunc.sum(DailyStoreSales.net_sales)).where(
                and_(
                    DailyStoreSales.store_id == agr.store_id,
                    extract("year", DailyStoreSales.business_date) == year,
                    extract("month", DailyStoreSales.business_date) == month,
                )
            )
        )
        gross_revenue = sales_q.scalar() or Decimal("0")

        structure = agr.royalty_structure or {}
        royalty_type = structure.get("type", "revenue_pct")
        rate = Decimal(str(structure.get("rate", "0.05")))

        if royalty_type == "revenue_pct":
            royalty_base = gross_revenue
            royalty_amount = royalty_base * rate
        elif royalty_type == "tiered":
            tiers = structure.get("tiers", [])
            royalty_base = gross_revenue
            royalty_amount = Decimal("0")
            remaining = gross_revenue
            for tier in sorted(tiers, key=lambda t: t.get("threshold", 0)):
                threshold = Decimal(str(tier.get("threshold", 0)))
                tier_rate = Decimal(str(tier.get("rate", "0.05")))
                if remaining <= 0:
                    break
                taxable = min(remaining, threshold) if threshold > 0 else remaining
                royalty_amount += taxable * tier_rate
                remaining -= taxable
        elif royalty_type == "fixed":
            royalty_base = gross_revenue
            fixed_amount = Decimal(str(structure.get("fixed_amount", 0)))
            royalty_amount = fixed_amount
        else:
            royalty_base = gross_revenue
            royalty_amount = royalty_base * rate

        advertising_amount = gross_revenue * agr.advertising_fund_rate
        net_payable = royalty_amount + advertising_amount

        existing_q = await db.execute(
            select(FranchiseRoyaltyCalc).where(
                and_(
                    FranchiseRoyaltyCalc.agreement_id == agr.id,
                    FranchiseRoyaltyCalc.period_year == year,
                    FranchiseRoyaltyCalc.period_month == month,
                )
            )
        )
        existing = existing_q.scalar_one_or_none()

        if existing:
            existing.gross_revenue = gross_revenue
            existing.royalty_base = royalty_base
            existing.royalty_amount = royalty_amount
            existing.advertising_amount = advertising_amount
            existing.net_payable = net_payable
            calc_id = existing.id
        else:
            calc = FranchiseRoyaltyCalc(
                tenant_id=tenant_id,
                agreement_id=agr.id,
                store_id=agr.store_id,
                period_year=year,
                period_month=month,
                gross_revenue=gross_revenue,
                royalty_base=royalty_base,
                royalty_amount=royalty_amount,
                advertising_amount=advertising_amount,
                net_payable=net_payable,
                status="draft",
            )
            db.add(calc)
            calc_id = calc.id

        results.append({
            "agreement_id": str(agr.id),
            "store_id": str(agr.store_id),
            "period": f"{year}-{month:02d}",
            "gross_revenue": float(gross_revenue),
            "royalty_base": float(royalty_base),
            "royalty_amount": float(royalty_amount),
            "advertising_amount": float(advertising_amount),
            "net_payable": float(net_payable),
            "royalty_type": royalty_type,
            "status": "draft",
        })

    await db.commit()
    return results
