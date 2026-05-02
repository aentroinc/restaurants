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
from app.models.ontology import OntologyObjectType, OntologyField, OntologyRelationType
from app.models.ontology_v2 import (
    OntologyObjectTypeV2, OntologyPropertyType, OntologyLinkType,
    OntologyInstance, OntologyLink,
)
from app.models.industry_playbook import IndustryPlaybook
from app.models.kpi_definition import KPIDefinition
from app.models.lineage import LineageEvent
from app.models.writeback import WritebackPolicy, WritebackRequest
from app.models.workspace import Analysis, CustomKPI, Cohort, SavedQuery
from app.models.rbac import Role, Permission, UserRole
from app.models.recipe import Ingredient, Recipe, RecipeBOM, IngredientPriceHistory
from app.models.shift import ShiftPattern, Shift, LaborLawProfile
from app.models.qsc import QSCTemplate, QSCAudit
from app.models.haccp import CCPDefinition, HACCPMonitoring, AllergenMatrix
from app.models.franchise import FranchiseAgreement, FranchiseRoyaltyCalc
from app.models.benchmark import IndustryBenchmark
from app.models.data_source import DataSourceV2, IngestionJob
from app.models.auth_enterprise import IdentityProvider, AccessLog, LoginAttempt
from app.models.ontology_migration import OntologyMigrationJob
from app.models.trade_area import TradeArea, CompetitorStore, PopulationMesh
from app.models.pricing import PriceDecision, PriceElasticity
from app.seed.generators import (
    TENANT_ID, COMPANY_ID, BRANDS,
    generate_regions, generate_areas, generate_brands, generate_employees,
    generate_stores, generate_products, generate_daily_sales, generate_hourly_sales,
    generate_product_sales, generate_labor, generate_store_pl, generate_kpis,
    generate_reviews, generate_sv_visits, generate_tasks, generate_value_cases,
    generate_workflow_templates, generate_workflow_instances,
    generate_meeting_pack, generate_data_quality_issues,
    generate_users, generate_kpi_definitions, generate_ontology_data,
    generate_industry_playbooks, generate_lineage_events, generate_writeback_data,
    generate_ontology_v2_data,
    generate_roles_and_permissions, generate_workspace_data,
    generate_ingredients, generate_ingredient_price_history,
    generate_recipes_and_bom, generate_shifts, generate_labor_law_profile,
    generate_qsc_audits, generate_haccp_data, generate_franchise_data,
    generate_industry_benchmarks,
    generate_data_sources,
    generate_identity_providers, generate_access_logs, generate_login_attempts,
    generate_trade_areas, generate_competitors, generate_population_meshes,
    generate_pricing_data,
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
            "documents",
            "price_elasticities", "price_decisions",
            "competitor_stores", "trade_areas", "population_meshes",
            "ontology_migration_jobs",
            "account_locks", "mfa_secrets", "login_attempts", "access_logs", "identity_providers",
            "ingestion_jobs", "data_sources_v2",
            "franchise_royalty_calcs", "franchise_agreements",
            "allergen_matrix", "haccp_monitoring", "ccp_definitions",
            "qsc_audits", "qsc_templates",
            "shifts", "shift_patterns", "labor_law_profiles",
            "recipe_bom", "ingredient_price_history", "recipes", "ingredients",
            "industry_benchmarks",
            "saved_queries", "cohorts", "custom_kpis", "analyses",
            "user_roles", "permissions", "roles",
            "ontology_links", "ontology_instances",
            "ontology_link_types_v2", "ontology_property_types",
            "ontology_object_types_v2",
            "lineage_events", "writeback_requests", "writeback_policies",
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
            "industry_playbooks", "kpi_definitions",
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
            id=COMPANY_ID, tenant_id=TENANT_ID, name="ゼンショーホールディングス", logo_url=None
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

        start_date = date(2023, 4, 1)
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
        batch_size = 50000
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

        # 21. KPI Definitions
        print("Creating KPI definitions...")
        kpi_defs = generate_kpi_definitions()
        bulk_insert(session, KPIDefinition, kpi_defs)
        session.commit()
        print(f"  {len(kpi_defs)} KPI definitions created.")

        # 22. Ontology Data (object types, fields, relation types)
        print("Creating ontology data...")
        ont_types, ont_fields, ont_relations = generate_ontology_data()
        bulk_insert(session, OntologyObjectType, ont_types)
        session.commit()
        bulk_insert(session, OntologyField, ont_fields)
        session.commit()
        bulk_insert(session, OntologyRelationType, ont_relations)
        session.commit()
        print(f"  {len(ont_types)} object types, {len(ont_fields)} fields, {len(ont_relations)} relation types created.")

        # 22b. Ontology V2 Data (dynamic ontology)
        print("Creating ontology v2 data...")
        v2_types, v2_props, v2_link_types, v2_instances = generate_ontology_v2_data(stores)
        bulk_insert(session, OntologyObjectTypeV2, v2_types)
        session.commit()
        bulk_insert(session, OntologyPropertyType, v2_props)
        session.commit()
        bulk_insert(session, OntologyLinkType, v2_link_types)
        session.commit()
        bulk_insert(session, OntologyInstance, v2_instances)
        session.commit()
        print(f"  {len(v2_types)} v2 object types, {len(v2_props)} properties, {len(v2_link_types)} link types, {len(v2_instances)} instances created.")

        # 23. Industry Playbooks
        print("Creating industry playbooks...")
        playbooks = generate_industry_playbooks()
        bulk_insert(session, IndustryPlaybook, playbooks)
        session.commit()
        print(f"  {len(playbooks)} industry playbooks created.")

        # 24. Lineage Events
        print("Creating lineage events...")
        lineage_events = generate_lineage_events(stores)
        bulk_insert(session, LineageEvent, lineage_events)
        session.commit()
        print(f"  {len(lineage_events)} lineage events created.")

        # 25. Writeback Policies & Requests
        print("Creating writeback data...")
        wb_policies, wb_requests = generate_writeback_data(stores)
        bulk_insert(session, WritebackPolicy, wb_policies)
        session.commit()
        bulk_insert(session, WritebackRequest, wb_requests)
        session.commit()
        print(f"  {len(wb_policies)} policies, {len(wb_requests)} requests created.")

        # 26. RBAC Roles, Permissions, UserRoles
        print("Creating RBAC roles and permissions...")
        rbac_roles, rbac_perms, rbac_user_roles = generate_roles_and_permissions()
        bulk_insert(session, Role, rbac_roles)
        session.commit()
        bulk_insert(session, Permission, rbac_perms)
        session.commit()
        bulk_insert(session, UserRole, rbac_user_roles)
        session.commit()
        print(f"  {len(rbac_roles)} roles, {len(rbac_perms)} permissions, {len(rbac_user_roles)} user-role assignments created.")

        # 27. Workspace Data (Analyses, Custom KPIs, Cohorts, Saved Queries)
        print("Creating workspace data...")
        ws_analyses, ws_kpis, ws_cohorts, ws_queries = generate_workspace_data()
        bulk_insert(session, Analysis, ws_analyses)
        session.commit()
        bulk_insert(session, CustomKPI, ws_kpis)
        session.commit()
        bulk_insert(session, Cohort, ws_cohorts)
        session.commit()
        bulk_insert(session, SavedQuery, ws_queries)
        session.commit()
        print(f"  {len(ws_analyses)} analyses, {len(ws_kpis)} custom KPIs, {len(ws_cohorts)} cohorts, {len(ws_queries)} saved queries created.")

        # 28. Ingredients + Price History
        print("Creating ingredients...")
        ingredients = generate_ingredients()
        bulk_insert(session, Ingredient, ingredients)
        session.commit()
        print(f"  {len(ingredients)} ingredients created.")

        print("Creating ingredient price history...")
        ing_prices = generate_ingredient_price_history(ingredients)
        bulk_insert(session, IngredientPriceHistory, ing_prices)
        session.commit()
        print(f"  {len(ing_prices)} ingredient price records created.")

        # 29. Recipes + BOM
        print("Creating recipes and BOM...")
        recipes, bom_entries = generate_recipes_and_bom(products, ingredients)
        bulk_insert(session, Recipe, recipes)
        session.commit()
        bulk_insert(session, RecipeBOM, bom_entries)
        session.commit()
        print(f"  {len(recipes)} recipes, {len(bom_entries)} BOM entries created.")

        # 30. Shifts + Labor Law Profile
        print("Creating shifts...")
        shifts = generate_shifts(stores, employees)
        bulk_insert(session, Shift, shifts)
        session.commit()
        print(f"  {len(shifts)} shifts created.")

        print("Creating labor law profile...")
        llp = generate_labor_law_profile()
        bulk_insert(session, LaborLawProfile, llp)
        session.commit()

        # 31. QSC Audits
        print("Creating QSC templates and audits...")
        qsc_templates, qsc_audits = generate_qsc_audits(stores)
        bulk_insert(session, QSCTemplate, qsc_templates)
        session.commit()
        bulk_insert(session, QSCAudit, qsc_audits)
        session.commit()
        print(f"  {len(qsc_templates)} templates, {len(qsc_audits)} audits created.")

        # 32. HACCP Data
        print("Creating HACCP data...")
        ccps, haccp_monitoring, allergen_matrix = generate_haccp_data(stores, products)
        bulk_insert(session, CCPDefinition, ccps)
        session.commit()
        for i in range(0, len(haccp_monitoring), batch_size):
            batch = haccp_monitoring[i:i+batch_size]
            bulk_insert(session, HACCPMonitoring, batch)
            session.commit()
        bulk_insert(session, AllergenMatrix, allergen_matrix)
        session.commit()
        print(f"  {len(ccps)} CCPs, {len(haccp_monitoring)} monitoring records, {len(allergen_matrix)} allergen entries created.")

        # 33. Franchise Data
        print("Creating franchise data...")
        fc_agreements, fc_royalties = generate_franchise_data(stores)
        bulk_insert(session, FranchiseAgreement, fc_agreements)
        session.commit()
        bulk_insert(session, FranchiseRoyaltyCalc, fc_royalties)
        session.commit()
        print(f"  {len(fc_agreements)} agreements, {len(fc_royalties)} royalty calcs created.")

        # 34. Industry Benchmarks
        print("Creating industry benchmarks...")
        benchmarks = generate_industry_benchmarks()
        bulk_insert(session, IndustryBenchmark, benchmarks)
        session.commit()
        print(f"  {len(benchmarks)} benchmarks created.")

        # 35. Data Sources + Ingestion Jobs (Connector Framework)
        print("Creating data sources and ingestion jobs...")
        data_sources, ingestion_jobs = generate_data_sources()
        bulk_insert(session, DataSourceV2, data_sources)
        session.commit()
        bulk_insert(session, IngestionJob, ingestion_jobs)
        session.commit()
        print(f"  {len(data_sources)} data sources, {len(ingestion_jobs)} ingestion jobs created.")

        # 36. Identity Providers
        print("Creating identity providers...")
        idps = generate_identity_providers()
        bulk_insert(session, IdentityProvider, idps)
        session.commit()
        print(f"  {len(idps)} identity providers created.")

        # 37. Access Logs
        print("Creating access logs...")
        access_logs_data = generate_access_logs()
        bulk_insert(session, AccessLog, access_logs_data)
        session.commit()
        print(f"  {len(access_logs_data)} access logs created.")

        # 38. Login Attempts
        print("Creating login attempts...")
        login_attempts = generate_login_attempts()
        bulk_insert(session, LoginAttempt, login_attempts)
        session.commit()
        print(f"  {len(login_attempts)} login attempts created.")

        # 39. Trade Areas
        print("Creating trade areas...")
        trade_areas = generate_trade_areas(stores)
        bulk_insert(session, TradeArea, trade_areas)
        session.commit()
        print(f"  {len(trade_areas)} trade areas created.")

        # 40. Competitor Stores
        print("Creating competitor stores...")
        competitors = generate_competitors(stores)
        bulk_insert(session, CompetitorStore, competitors)
        session.commit()
        print(f"  {len(competitors)} competitor stores created.")

        # 41. Population Meshes
        print("Creating population meshes...")
        meshes = generate_population_meshes()
        bulk_insert(session, PopulationMesh, meshes)
        session.commit()
        print(f"  {len(meshes)} population meshes created.")

        # 42. Pricing Data (Price Decisions + Elasticities)
        print("Creating pricing data...")
        price_decisions, price_elasticities = generate_pricing_data(products)
        bulk_insert(session, PriceDecision, price_decisions)
        session.commit()
        bulk_insert(session, PriceElasticity, price_elasticities)
        session.commit()
        print(f"  {len(price_decisions)} price decisions, {len(price_elasticities)} price elasticities created.")

        # 43. Vector extension + RAG document indexing
        print("Creating vector extension...")
        session.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        session.commit()

        print("Indexing documents for RAG...")
        from app.services.ai.document_indexer import index_all_documents
        result = index_all_documents(str(TENANT_ID))
        print(f"  {result['indexed']} documents indexed.")

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
