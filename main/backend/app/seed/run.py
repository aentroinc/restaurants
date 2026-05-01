"""Seed script — idempotent, deterministic (seed=42), sync SQLAlchemy."""
import sys
import os
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy import text
from app.database import sync_engine, SyncSession, Base
from app.models import *  # noqa: ensure all models are registered
from app.models.tenant import Tenant
from app.models.company import Company
from app.models.brand import Brand
from app.models.region import Region
from app.models.area import Area
from app.models.employee import Employee
from app.models.store import Store
from app.models.product import Product
from app.models.daily_sales import DailyStoreSales
from app.models.hourly_sales import HourlyStoreSales
from app.models.product_sales import DailyProductSales
from app.models.labor import LaborActual
from app.models.store_pl import StorePL
from app.models.kpi import StoreDailyKPI
from app.models.review import Review
from app.models.sv_visit import SVVisit
from app.models.task import Task
from app.models.meeting_pack import BoardMeetingPack, BoardMeetingItem
from app.models.data_quality import DataQualityIssue
from app.models.value_case import ValueCase, ValueCaseMetric
from app.models.workflow import WorkflowTemplate, WorkflowInstance, WorkflowEvent
from app.models.user import User
from app.seed.generators import (
    TENANT_ID, COMPANY_ID, BRANDS,
    generate_regions, generate_areas, generate_brands, generate_employees,
    generate_stores, generate_products, generate_daily_sales, generate_hourly_sales,
    generate_product_sales, generate_labor, generate_store_pl, generate_kpis,
    generate_reviews, generate_sv_visits, generate_tasks, generate_value_cases,
    generate_workflow_templates, generate_workflow_instances,
    generate_meeting_pack, generate_data_quality_issues,
    generate_users,
)


def bulk_insert(session, model_class, records, exclude_keys=None):
    if not records:
        return
    if exclude_keys is None:
        exclude_keys = set()
    clean = []
    for r in records:
        clean.append({k: v for k, v in r.items() if not k.startswith("_") and k not in exclude_keys})
    session.bulk_insert_mappings(model_class, clean)


def run():
    print("Creating tables...")
    Base.metadata.create_all(sync_engine)

    session = SyncSession()
    try:
        print("Clearing existing data...")
        # Delete in reverse dependency order
        tables = [
            "workflow_events", "workflow_instances", "workflow_templates",
            "board_meeting_items", "board_meeting_packs",
            "value_case_metrics", "value_cases",
            "ai_query_logs", "audit_logs", "access_scopes", "users",
            "data_quality_issues",
            "store_daily_kpi", "store_pl",
            "daily_product_sales", "hourly_store_sales", "daily_store_sales",
            "labor_actuals", "sv_visits", "tasks", "reviews",
            "products", "stores",
            "ontology_fields", "ontology_relation_types", "ontology_object_types",
            "ingestion_batches", "data_contracts", "schema_mappings",
            "industry_playbooks",
            "areas", "employees", "regions", "brands", "companies", "tenants",
        ]
        for t in tables:
            try:
                session.execute(text(f"DELETE FROM {t}"))
            except Exception:
                session.rollback()
                session = SyncSession()

        session.commit()
        print("Existing data cleared.")

        # 1. Tenant + Company
        print("Creating tenant and company...")
        session.execute(Tenant.__table__.insert().values(
            id=TENANT_ID, name="demo", slug="demo", settings={}, active=True
        ))
        session.execute(Company.__table__.insert().values(
            id=COMPANY_ID, tenant_id=TENANT_ID, name="AENTRO Foods", logo_url=None
        ))
        session.commit()

        # 2. Regions
        print("Creating regions...")
        regions = generate_regions()
        bulk_insert(session, Region, regions)
        session.commit()

        # 3. Employees (needed before areas for SV assignment)
        print("Creating areas and employees...")
        areas = generate_areas(regions)
        # Insert areas without sv_employee_id first
        areas_no_sv = [{k: (None if k == "sv_employee_id" else v) for k, v in a.items()} for a in areas]
        bulk_insert(session, Area, areas_no_sv)
        session.commit()

        employees = generate_employees(areas)
        bulk_insert(session, Employee, employees)
        session.commit()

        # Update areas with SV assignments
        for area in areas:
            if area["sv_employee_id"]:
                session.execute(
                    text("UPDATE areas SET sv_employee_id = :sv_id WHERE id = :area_id"),
                    {"sv_id": str(area["sv_employee_id"]), "area_id": str(area["id"])}
                )
        session.commit()

        # 4. Brands
        print("Creating brands...")
        brands = generate_brands()
        bulk_insert(session, Brand, brands)
        session.commit()

        # 5. Stores
        print("Creating stores...")
        stores = generate_stores(BRANDS, brands, areas, employees)
        bulk_insert(session, Store, stores)
        session.commit()

        # 6. Products
        print("Creating products...")
        products = generate_products(brands)
        bulk_insert(session, Product, products)
        session.commit()

        start_date = date(2024, 4, 1)
        end_date = date(2026, 4, 30)

        # 7. Reviews (needed for KPI calculation)
        print("Creating reviews...")
        reviews = generate_reviews(stores, start_date, end_date)
        bulk_insert(session, Review, reviews)
        session.commit()
        print(f"  {len(reviews)} reviews created.")

        # 8. Tasks (needed for KPI calculation)
        print("Creating tasks...")
        tasks = generate_tasks(stores, employees)
        bulk_insert(session, Task, tasks)
        session.commit()
        print(f"  {len(tasks)} tasks created.")

        # 9. Daily Sales
        print("Creating daily sales (this will take a moment)...")
        daily_sales = generate_daily_sales(stores, start_date, end_date)
        # Insert in batches
        batch_size = 10000
        for i in range(0, len(daily_sales), batch_size):
            batch = daily_sales[i:i+batch_size]
            bulk_insert(session, DailyStoreSales, batch)
            session.commit()
            print(f"  daily_sales batch {i//batch_size + 1}/{(len(daily_sales) + batch_size - 1)//batch_size}")
        print(f"  {len(daily_sales)} daily sales records created.")

        # 10. Hourly Sales
        print("Creating hourly sales...")
        hourly_sales = generate_hourly_sales(daily_sales)
        for i in range(0, len(hourly_sales), batch_size):
            batch = hourly_sales[i:i+batch_size]
            bulk_insert(session, HourlyStoreSales, batch)
            session.commit()
        print(f"  {len(hourly_sales)} hourly sales records created.")

        # 11. Product Sales
        print("Creating product sales...")
        product_sales = generate_product_sales(stores, products, start_date, end_date)
        for i in range(0, len(product_sales), batch_size):
            batch = product_sales[i:i+batch_size]
            bulk_insert(session, DailyProductSales, batch)
            session.commit()
        print(f"  {len(product_sales)} product sales records created.")

        # 12. Labor
        print("Creating labor records...")
        labor = generate_labor(stores, start_date, end_date)
        for i in range(0, len(labor), batch_size):
            batch = labor[i:i+batch_size]
            bulk_insert(session, LaborActual, batch)
            session.commit()
        print(f"  {len(labor)} labor records created.")

        # 13. Store PL
        print("Creating store PL...")
        store_pls = generate_store_pl(stores, daily_sales, labor, start_date, end_date)
        bulk_insert(session, StorePL, store_pls)
        session.commit()
        print(f"  {len(store_pls)} store PL records created.")

        # 14. KPIs
        print("Creating KPIs...")
        kpis = generate_kpis(stores, daily_sales, labor, store_pls, reviews, tasks)
        for i in range(0, len(kpis), batch_size):
            batch = kpis[i:i+batch_size]
            bulk_insert(session, StoreDailyKPI, batch)
            session.commit()
        print(f"  {len(kpis)} KPI records created.")

        # 15. SV Visits
        print("Creating SV visits...")
        sv_visits = generate_sv_visits(stores, employees, start_date, end_date)
        bulk_insert(session, SVVisit, sv_visits)
        session.commit()
        print(f"  {len(sv_visits)} SV visits created.")

        # 16. Value Cases
        print("Creating value cases...")
        value_cases, value_metrics = generate_value_cases(stores)
        bulk_insert(session, ValueCase, value_cases)
        session.commit()
        bulk_insert(session, ValueCaseMetric, value_metrics)
        session.commit()
        print(f"  {len(value_cases)} value cases created.")

        # 17. Workflow Templates + Instances + Events
        print("Creating workflow templates...")
        wf_templates = generate_workflow_templates()
        bulk_insert(session, WorkflowTemplate, wf_templates)
        session.commit()

        print("Creating workflow instances and events...")
        wf_instances, wf_events = generate_workflow_instances(wf_templates, stores, tasks, employees)
        bulk_insert(session, WorkflowInstance, wf_instances)
        session.commit()
        bulk_insert(session, WorkflowEvent, wf_events)
        session.commit()
        print(f"  {len(wf_instances)} workflow instances, {len(wf_events)} events created.")

        # 18. Meeting Pack
        print("Creating meeting pack...")
        pack, items = generate_meeting_pack(stores, tasks)
        bulk_insert(session, BoardMeetingPack, [pack])
        session.commit()
        bulk_insert(session, BoardMeetingItem, items)
        session.commit()

        # 19. Data Quality Issues
        print("Creating data quality issues...")
        dq_issues = generate_data_quality_issues(stores)
        bulk_insert(session, DataQualityIssue, dq_issues)
        session.commit()

        # 20. Users
        print("Creating users...")
        users = generate_users()
        bulk_insert(session, User, users)
        session.commit()

        print("\nSeed complete!")
        print(f"  Stores: {len(stores)}")
        print(f"  Products: {len(products)}")
        print(f"  Employees: {len(employees)}")
        print(f"  Daily Sales: {len(daily_sales)}")
        print(f"  Hourly Sales: {len(hourly_sales)}")
        print(f"  Product Sales: {len(product_sales)}")
        print(f"  Labor: {len(labor)}")
        print(f"  Store PL: {len(store_pls)}")
        print(f"  KPIs: {len(kpis)}")
        print(f"  Reviews: {len(reviews)}")
        print(f"  SV Visits: {len(sv_visits)}")
        print(f"  Tasks: {len(tasks)}")
        print(f"  Value Cases: {len(value_cases)}")
        print(f"  Users: {len(users)}")

    except Exception as e:
        session.rollback()
        print(f"Error during seed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run()
