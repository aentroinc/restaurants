import base64
import os
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.daily_sales import DailyStoreSales
from app.models.hourly_sales import HourlyStoreSales
from app.models.ingestion import IngestionBatch
from app.models.pos_connector import POSConnectorConfig
from app.models.product import Product
from app.models.product_sales import DailyProductSales
from app.models.store import Store
from app.database import SyncSession


class POSConnectorError(Exception):
    pass


@dataclass
class DailySalesAggregate:
    external_store_id: str
    business_date: date
    net_sales: Decimal = Decimal(0)
    gross_sales: Decimal = Decimal(0)
    discount_amount: Decimal = Decimal(0)
    order_count: int = 0
    customer_count: int = 0
    source_ids: list[str] = field(default_factory=list)


@dataclass
class HourlySalesAggregate:
    external_store_id: str
    business_date: date
    hour: int
    net_sales: Decimal = Decimal(0)
    order_count: int = 0
    customer_count: int = 0


@dataclass
class ProductSalesAggregate:
    external_store_id: str
    external_product_id: str
    business_date: date
    quantity: Decimal = Decimal(0)
    net_sales: Decimal = Decimal(0)
    discount_amount: Decimal = Decimal(0)


JAPAN_POS_PROVIDERS = [
    {
        "provider": "smaregi",
        "display_name": "スマレジ Platform API",
        "country": "JP",
        "auth_type": "client_credentials",
        "entity_types": ["daily_sales", "hourly_sales", "product_sales"],
        "required_credentials": ["contract_id", "client_id_env", "client_secret_env"],
        "required_scopes": ["pos.transactions:read", "pos.stores:read"],
    },
    {
        "provider": "enterprise_pos_dwh",
        "display_name": "大手外食 本部DWH / POSデータマート",
        "country": "JP",
        "auth_type": "file_or_private_api",
        "entity_types": ["daily_sales", "hourly_sales", "product_sales", "store_master"],
        "required_credentials": ["connection_owner"],
        "required_scopes": [],
    },
]


def mask_credentials(credentials: dict | None) -> dict:
    credentials = credentials or {}
    masked = {}
    for key, value in credentials.items():
        if "secret" in key or "token" in key or "password" in key:
            masked[key] = "***" if value else ""
        else:
            masked[key] = value
    return masked


def connector_to_dict(config: POSConnectorConfig) -> dict:
    return {
        "id": str(config.id),
        "provider": config.provider,
        "display_name": config.display_name,
        "status": config.status,
        "credentials": mask_credentials(config.credentials),
        "settings": config.settings or {},
        "store_mappings": config.store_mappings or {},
        "mapped_store_count": len(config.store_mappings or {}),
        "last_tested_at": config.last_tested_at.isoformat() if config.last_tested_at else None,
        "last_success_at": config.last_success_at.isoformat() if config.last_success_at else None,
        "last_failure_at": config.last_failure_at.isoformat() if config.last_failure_at else None,
        "last_error": config.last_error,
        "created_at": config.created_at.isoformat() if config.created_at else None,
        "updated_at": config.updated_at.isoformat() if config.updated_at else None,
    }


def _required_credential(credentials: dict, key: str) -> str:
    value = credentials.get(key)
    if not value:
        raise POSConnectorError(f"Missing credential: {key}")
    return str(value)


def _resolve_secret(credentials: dict, direct_key: str, env_key: str) -> str:
    direct = credentials.get(direct_key)
    if direct:
        return str(direct)
    env_name = credentials.get(env_key)
    if env_name:
        value = os.getenv(str(env_name))
        if value:
            return value
        raise POSConnectorError(f"Environment variable is not set: {env_name}")
    raise POSConnectorError(f"Missing credential: {direct_key} or {env_key}")


def _smaregi_hosts(settings: dict) -> tuple[str, str]:
    environment = settings.get("environment", "sandbox")
    if environment == "production":
        return "https://id.smaregi.jp", "https://api.smaregi.jp"
    return "https://id.smaregi.dev", "https://api.smaregi.dev"


async def _get_smaregi_access_token(config: POSConnectorConfig) -> str:
    credentials = config.credentials or {}
    settings = config.settings or {}
    token = credentials.get("access_token")
    if token:
        return str(token)
    token_env = credentials.get("access_token_env")
    if token_env:
        token_value = os.getenv(str(token_env))
        if token_value:
            return token_value

    contract_id = _required_credential(credentials, "contract_id")
    client_id = _resolve_secret(credentials, "client_id", "client_id_env")
    client_secret = _resolve_secret(credentials, "client_secret", "client_secret_env")
    scope = settings.get("scope", "pos.transactions:read pos.stores:read")
    id_host, _ = _smaregi_hosts(settings)
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{id_host}/app/{contract_id}/token",
            headers={
                "Authorization": f"Basic {basic}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials", "scope": scope},
        )
    if response.status_code >= 400:
        raise POSConnectorError(f"Smaregi token request failed: {response.status_code} {response.text[:300]}")
    payload = response.json()
    access_token = payload.get("access_token")
    if not access_token:
        raise POSConnectorError("Smaregi token response did not include access_token")
    return access_token


async def _smaregi_get(config: POSConnectorConfig, path: str, params: dict | None = None) -> Any:
    credentials = config.credentials or {}
    settings = config.settings or {}
    contract_id = _required_credential(credentials, "contract_id")
    token = await _get_smaregi_access_token(config)
    _, api_host = _smaregi_hosts(settings)
    url = f"{api_host}/{contract_id}/pos/{path.lstrip('/')}"

    async with httpx.AsyncClient(timeout=45.0) as client:
        response = await client.get(url, headers={"Authorization": f"Bearer {token}"}, params=params or {})
    if response.status_code >= 400:
        raise POSConnectorError(f"Smaregi API request failed: {response.status_code} {response.text[:300]}")
    return response.json()


async def test_pos_connection(config: POSConnectorConfig) -> dict:
    if config.provider != "smaregi":
        return {
            "connected": True,
            "provider": config.provider,
            "message": "Private API / DWH connector configuration is present. Run a sync with a tenant-specific adapter.",
        }

    stores = await _smaregi_get(config, "stores", params={"limit": 10, "page": 1})
    if isinstance(stores, dict):
        store_items = stores.get("stores") or stores.get("data") or stores.get("items") or []
    else:
        store_items = stores
    return {
        "connected": True,
        "provider": "smaregi",
        "sample_store_count": len(store_items) if isinstance(store_items, list) else 0,
        "sample_stores": store_items[:5] if isinstance(store_items, list) else [],
    }


def _parse_smaregi_date(value: str | None) -> date | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _parse_smaregi_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S.%f%z"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _decimal_from_transaction(tx: dict, keys: tuple[str, ...]) -> Decimal:
    for key in keys:
        if key in tx and tx[key] not in (None, ""):
            try:
                return Decimal(str(tx[key]).replace(",", ""))
            except Exception:
                return Decimal(0)
    return Decimal(0)


def _transaction_details(tx: dict) -> list[dict]:
    for key in ("transactionDetails", "details", "TransactionDetails", "transaction_details"):
        value = tx.get(key)
        if isinstance(value, list):
            return value
    return []


def _aggregate_smaregi_transactions(
    transactions: list[dict],
) -> tuple[
    dict[tuple[str, date], DailySalesAggregate],
    dict[tuple[str, date, int], HourlySalesAggregate],
    dict[tuple[str, str, date], ProductSalesAggregate],
]:
    daily: dict[tuple[str, date], DailySalesAggregate] = {}
    hourly: dict[tuple[str, date, int], HourlySalesAggregate] = {}
    product: dict[tuple[str, str, date], ProductSalesAggregate] = {}

    for tx in transactions:
        division = str(tx.get("transactionHeadDivision") or tx.get("transaction_head_division") or "1")
        cancel_division = str(tx.get("cancelDivision") or tx.get("cancel_division") or "0")
        if division != "1" or cancel_division not in ("0", "", "None"):
            continue

        store_id = str(tx.get("storeId") or tx.get("store_id") or tx.get("storeCode") or tx.get("store_code") or "")
        business_date = (
            _parse_smaregi_date(tx.get("sumDate") or tx.get("sum_date"))
            or _parse_smaregi_date(tx.get("terminalTranDateTime") or tx.get("terminal_tran_date_time"))
            or _parse_smaregi_date(tx.get("transactionDateTime") or tx.get("transaction_date_time"))
        )
        if not store_id or not business_date:
            continue
        transacted_at = (
            _parse_smaregi_datetime(tx.get("terminalTranDateTime") or tx.get("terminal_tran_date_time"))
            or _parse_smaregi_datetime(tx.get("transactionDateTime") or tx.get("transaction_date_time"))
        )

        daily_key = (store_id, business_date)
        if daily_key not in daily:
            daily[daily_key] = DailySalesAggregate(external_store_id=store_id, business_date=business_date)
        aggregate = daily[daily_key]

        net_sales = _decimal_from_transaction(tx, ("total", "totalAmount", "salesPriceTotal", "amount", "sumTotal"))
        discount = _decimal_from_transaction(
            tx,
            ("subtotalDiscountPrice", "discount", "discountPrice", "pointDiscount", "couponDiscount"),
        )
        aggregate.net_sales += net_sales
        aggregate.gross_sales += net_sales + discount
        aggregate.discount_amount += discount
        aggregate.order_count += 1
        aggregate.customer_count += int(_decimal_from_transaction(tx, ("customerCount", "headCount")) or Decimal(1))
        source_id = tx.get("transactionHeadId") or tx.get("transactionUuid") or tx.get("transactionId")
        if source_id:
            aggregate.source_ids.append(str(source_id))

        if transacted_at:
            hour_key = (store_id, business_date, transacted_at.hour)
            if hour_key not in hourly:
                hourly[hour_key] = HourlySalesAggregate(
                    external_store_id=store_id,
                    business_date=business_date,
                    hour=transacted_at.hour,
                )
            hourly_aggregate = hourly[hour_key]
            hourly_aggregate.net_sales += net_sales
            hourly_aggregate.order_count += 1
            hourly_aggregate.customer_count += int(_decimal_from_transaction(tx, ("customerCount", "headCount")) or Decimal(1))

        for detail in _transaction_details(tx):
            product_id = str(
                detail.get("productId")
                or detail.get("productCode")
                or detail.get("product_id")
                or detail.get("product_code")
                or ""
            )
            if not product_id:
                continue
            product_key = (store_id, product_id, business_date)
            if product_key not in product:
                product[product_key] = ProductSalesAggregate(
                    external_store_id=store_id,
                    external_product_id=product_id,
                    business_date=business_date,
                )
            product_aggregate = product[product_key]
            product_aggregate.quantity += _decimal_from_transaction(detail, ("quantity", "salesQuantity", "sales_quantity"))
            product_aggregate.net_sales += _decimal_from_transaction(
                detail,
                ("salesPrice", "salesPriceSubtotal", "productSalesTotal", "total", "amount"),
            )
            product_aggregate.discount_amount += _decimal_from_transaction(
                detail,
                ("discountPrice", "discount", "subtotalDiscountPrice"),
            )

    return daily, hourly, product


async def _fetch_smaregi_transactions(config: POSConnectorConfig, date_from: date, date_to: date) -> list[dict]:
    settings = config.settings or {}
    limit = min(int(settings.get("page_size", 1000)), 1000)
    max_pages = int(settings.get("max_pages_per_sync", 200))
    params_base = {
        "sum_date-from": date_from.isoformat(),
        "sum_date-to": date_to.isoformat(),
        "with_details": settings.get("with_details", "summary"),
        "with_payments": "none",
        "limit": min(limit, 100 if settings.get("with_details", "summary") != "none" else 1000),
    }

    all_rows: list[dict] = []
    for page in range(1, max_pages + 1):
        payload = await _smaregi_get(config, "transactions", params={**params_base, "page": page})
        if isinstance(payload, list):
            rows = payload
        else:
            rows = payload.get("transactions") or payload.get("data") or payload.get("items") or []
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < limit:
            break
    return all_rows


async def _store_lookup(db: AsyncSession, tenant_id: str) -> dict[str, uuid.UUID]:
    result = await db.execute(select(Store.code, Store.id).where(Store.tenant_id == uuid.UUID(tenant_id)))
    return {code: store_id for code, store_id in result.all()}


async def _product_lookup(db: AsyncSession, tenant_id: str) -> dict[str, tuple[uuid.UUID, Decimal]]:
    result = await db.execute(
        select(Product.code, Product.id, Product.theoretical_cost).where(Product.tenant_id == uuid.UUID(tenant_id))
    )
    return {code: (product_id, cost or Decimal(0)) for code, product_id, cost in result.all()}


async def sync_pos_daily_sales(
    db: AsyncSession,
    tenant_id: str,
    config: POSConnectorConfig,
    date_from: date,
    date_to: date,
) -> dict:
    if config.provider != "smaregi":
        raise POSConnectorError("Only the smaregi connector has a built-in API sync. Use CSV ingestion for enterprise_pos_dwh.")

    transactions = await _fetch_smaregi_transactions(config, date_from, date_to)
    daily_aggregates, hourly_aggregates, product_aggregates = _aggregate_smaregi_transactions(transactions)
    store_by_code = await _store_lookup(db, tenant_id)
    product_by_code = await _product_lookup(db, tenant_id)
    store_mappings = config.store_mappings or {}
    product_mappings = (config.settings or {}).get("product_mappings", {})

    batch = IngestionBatch(
        tenant_id=uuid.UUID(tenant_id),
        source_system=f"smaregi:{config.display_name}",
        entity_type="daily_sales",
        file_name=f"smaregi_transactions_{date_from.isoformat()}_{date_to.isoformat()}",
        file_hash=None,
        status="promoting",
        row_count=len(transactions),
        valid_row_count=0,
        invalid_row_count=0,
        validation_errors=[],
    )
    db.add(batch)
    await db.flush()

    loaded = 0
    skipped = 0
    errors = []
    affected_store_ids: set[str] = set()
    affected_dates: set[date] = set()

    for (external_store_id, business_date), aggregate in daily_aggregates.items():
        store_code = store_mappings.get(external_store_id) or external_store_id
        store_id = store_by_code.get(store_code)
        if not store_id:
            skipped += 1
            errors.append({
                "external_store_id": external_store_id,
                "business_date": business_date.isoformat(),
                "error": "store mapping not found",
            })
            continue

        existing = (
            await db.execute(
                select(DailyStoreSales).where(
                    DailyStoreSales.tenant_id == uuid.UUID(tenant_id),
                    DailyStoreSales.store_id == store_id,
                    DailyStoreSales.business_date == business_date,
                )
            )
        ).scalar_one_or_none()

        values = {
            "gross_sales": aggregate.gross_sales,
            "net_sales": aggregate.net_sales,
            "customer_count": aggregate.customer_count or aggregate.order_count,
            "order_count": aggregate.order_count,
            "discount_amount": aggregate.discount_amount,
            "dine_in_sales": aggregate.net_sales,
            "takeout_sales": Decimal(0),
            "delivery_sales": Decimal(0),
        }
        if existing:
            for key, value in values.items():
                setattr(existing, key, value)
        else:
            db.add(
                DailyStoreSales(
                    tenant_id=uuid.UUID(tenant_id),
                    store_id=store_id,
                    business_date=business_date,
                    **values,
                )
            )
        loaded += 1
        affected_store_ids.add(str(store_id))
        affected_dates.add(business_date)

    hourly_loaded = 0
    if affected_store_ids and affected_dates:
        await db.execute(
            delete(HourlyStoreSales).where(
                HourlyStoreSales.tenant_id == uuid.UUID(tenant_id),
                HourlyStoreSales.store_id.in_([uuid.UUID(s) for s in affected_store_ids]),
                HourlyStoreSales.business_date.in_(affected_dates),
            )
        )

    for (external_store_id, business_date, hour), aggregate in hourly_aggregates.items():
        store_code = store_mappings.get(external_store_id) or external_store_id
        store_id = store_by_code.get(store_code)
        if not store_id:
            continue
        db.add(
            HourlyStoreSales(
                tenant_id=uuid.UUID(tenant_id),
                store_id=store_id,
                business_date=business_date,
                hour=hour,
                net_sales=aggregate.net_sales,
                customer_count=aggregate.customer_count or aggregate.order_count,
                order_count=aggregate.order_count,
            )
        )
        hourly_loaded += 1

    product_loaded = 0
    product_skipped = 0
    if affected_store_ids and affected_dates:
        await db.execute(
            delete(DailyProductSales).where(
                DailyProductSales.tenant_id == uuid.UUID(tenant_id),
                DailyProductSales.store_id.in_([uuid.UUID(s) for s in affected_store_ids]),
                DailyProductSales.business_date.in_(affected_dates),
            )
        )

    for (external_store_id, external_product_id, business_date), aggregate in product_aggregates.items():
        store_code = store_mappings.get(external_store_id) or external_store_id
        product_code = product_mappings.get(external_product_id) or external_product_id
        store_id = store_by_code.get(store_code)
        product_entry = product_by_code.get(product_code)
        if not store_id:
            errors.append({
                "external_store_id": external_store_id,
                "business_date": business_date.isoformat(),
                "error": f"Unknown store mapping for product sales: {external_store_id}",
            })
            product_skipped += 1
            continue
        if not product_entry:
            errors.append({
                "external_store_id": external_store_id,
                "external_product_id": external_product_id,
                "business_date": business_date.isoformat(),
                "error": f"Unknown product mapping: {external_product_id}",
            })
            product_skipped += 1
            continue
        product_id, theoretical_cost = product_entry
        db.add(
            DailyProductSales(
                tenant_id=uuid.UUID(tenant_id),
                store_id=store_id,
                product_id=product_id,
                business_date=business_date,
                quantity=int(aggregate.quantity),
                net_sales=aggregate.net_sales,
                discount_amount=aggregate.discount_amount,
                theoretical_cogs=theoretical_cost * aggregate.quantity,
            )
        )
        product_loaded += 1

    batch.valid_row_count = loaded + hourly_loaded + product_loaded
    batch.invalid_row_count = skipped + product_skipped
    batch.validation_errors = errors[:200] if errors else None
    invalid_count = skipped + product_skipped
    batch.status = "promoted" if invalid_count == 0 else "partial"
    batch.promoted_at = datetime.now(timezone.utc)

    config.status = "connected" if loaded > 0 or not errors else "error"
    config.last_success_at = datetime.now(timezone.utc) if loaded > 0 or not errors else config.last_success_at
    config.last_failure_at = datetime.now(timezone.utc) if invalid_count and loaded == 0 else config.last_failure_at
    config.last_error = errors[0]["error"] if errors and loaded == 0 else None
    await db.commit()

    kpi_result = {"recalculated_stores": 0, "recalculated_records": 0}
    if affected_store_ids:
        try:
            from app.services.kpi_engine import recalculate_kpis

            with SyncSession() as sync_session:
                kpi_result = recalculate_kpis(
                    session=sync_session,
                    tenant_id=tenant_id,
                    store_ids=list(affected_store_ids),
                    start_date=date_from,
                    end_date=date_to,
                )
        except Exception as exc:
            errors.append({"error": f"kpi recalculation failed: {exc}"})

    try:
        from app.services.lineage_tracker import track_lineage

        track_lineage(
            tenant_id,
            "ingestion",
            "smaregi_api",
            str(config.id),
            "daily_store_sales",
            None,
            transformation_name="smaregi_transactions_to_daily_sales",
            metadata={
                "batch_id": str(batch.id),
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "transactions": len(transactions),
                "loaded_daily_rows": loaded,
                "loaded_hourly_rows": hourly_loaded,
                "loaded_product_rows": product_loaded,
                "skipped_daily_rows": skipped,
                "skipped_product_rows": product_skipped,
                "kpi": kpi_result,
            },
        )
    except Exception:
        pass

    return {
        "batch_id": str(batch.id),
        "provider": config.provider,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "transactions_fetched": len(transactions),
        "daily_rows_loaded": loaded,
        "hourly_rows_loaded": hourly_loaded,
        "product_rows_loaded": product_loaded,
        "daily_rows_skipped": skipped,
        "product_rows_skipped": product_skipped,
        "kpi_recalculation": kpi_result,
        "status": batch.status,
        "errors": errors[:20],
    }
