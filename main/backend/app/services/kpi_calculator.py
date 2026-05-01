from decimal import Decimal, ROUND_HALF_UP


def calc_avg_ticket(net_sales: Decimal, customer_count: int) -> Decimal | None:
    if not customer_count:
        return None
    return (net_sales / customer_count).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def calc_cogs_rate(cogs: Decimal, net_sales: Decimal) -> Decimal | None:
    if not net_sales:
        return None
    return (cogs / net_sales * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calc_labor_cost_rate(labor_cost: Decimal, net_sales: Decimal) -> Decimal | None:
    if not net_sales:
        return None
    return (labor_cost / net_sales * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calc_fl_ratio(cogs: Decimal, labor_cost: Decimal, net_sales: Decimal) -> Decimal | None:
    if not net_sales:
        return None
    return ((cogs + labor_cost) / net_sales * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calc_sales_per_labor_hour(net_sales: Decimal, labor_hours: Decimal) -> Decimal | None:
    if not labor_hours:
        return None
    return (net_sales / labor_hours).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def calc_gross_profit_rate(gross_profit: Decimal, net_sales: Decimal) -> Decimal | None:
    if not net_sales:
        return None
    return (gross_profit / net_sales * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calc_operating_profit_rate(operating_profit: Decimal, net_sales: Decimal) -> Decimal | None:
    if not net_sales:
        return None
    return (operating_profit / net_sales * 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_all_kpis(
    net_sales: Decimal,
    customer_count: int,
    cogs: Decimal,
    labor_cost: Decimal,
    labor_hours: Decimal,
    gross_profit: Decimal | None = None,
    operating_profit: Decimal | None = None,
) -> dict:
    if gross_profit is None:
        gross_profit = net_sales - cogs
    if operating_profit is None:
        operating_profit = gross_profit - labor_cost

    return {
        "avg_ticket": calc_avg_ticket(net_sales, customer_count),
        "cogs_rate": calc_cogs_rate(cogs, net_sales),
        "labor_cost_rate": calc_labor_cost_rate(labor_cost, net_sales),
        "fl_ratio": calc_fl_ratio(cogs, labor_cost, net_sales),
        "sales_per_labor_hour": calc_sales_per_labor_hour(net_sales, labor_hours),
        "gross_profit": gross_profit,
        "gross_profit_rate": calc_gross_profit_rate(gross_profit, net_sales),
        "operating_profit": operating_profit,
        "operating_profit_rate": calc_operating_profit_rate(operating_profit, net_sales),
    }
