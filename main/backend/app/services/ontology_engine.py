"""Dynamic Ontology Runtime — validation, versioning, impact analysis."""
import re
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ontology_v2 import (
    OntologyObjectTypeV2, OntologyPropertyType, OntologyLinkType,
    OntologyInstance,
)
from app.models.kpi_definition import KPIDefinition
from app.models.lineage import LineageEvent
from app.models.workspace import CustomKPI, Analysis


async def validate_instance(
    session: AsyncSession,
    object_type_id: UUID,
    properties: dict,
    tenant_id: str,
) -> list[str]:
    """Validate properties against the object type's property definitions.
    Returns list of error messages (empty = valid).
    """
    result = await session.execute(
        select(OntologyPropertyType).where(
            OntologyPropertyType.object_type_id == object_type_id,
            OntologyPropertyType.tenant_id == tenant_id,
        ).order_by(OntologyPropertyType.sort_order)
    )
    prop_types = result.scalars().all()

    errors = []

    # check required fields
    for pt in prop_types:
        if pt.required and pt.api_name not in properties:
            errors.append(f"Required property '{pt.api_name}' is missing")

    # validate each provided property
    prop_type_map = {pt.api_name: pt for pt in prop_types}
    for key, value in properties.items():
        pt = prop_type_map.get(key)
        if pt is None:
            continue  # allow extra properties (flexible schema)

        if value is None:
            continue

        # type checks
        if pt.data_type == "string" and not isinstance(value, str):
            errors.append(f"Property '{key}' must be a string")
        elif pt.data_type == "int" and not isinstance(value, int):
            errors.append(f"Property '{key}' must be an integer")
        elif pt.data_type == "float" and not isinstance(value, (int, float)):
            errors.append(f"Property '{key}' must be a number")
        elif pt.data_type == "bool" and not isinstance(value, bool):
            errors.append(f"Property '{key}' must be a boolean")
        elif pt.data_type == "enum":
            if pt.enum_values and value not in pt.enum_values:
                errors.append(f"Property '{key}' must be one of {pt.enum_values}")
        elif pt.data_type == "array" and not isinstance(value, list):
            errors.append(f"Property '{key}' must be an array")
        elif pt.data_type == "object" and not isinstance(value, dict):
            errors.append(f"Property '{key}' must be an object")

        # validation rules (min/max/regex)
        if pt.validation and value is not None:
            v = pt.validation
            if "min" in v and isinstance(value, (int, float)) and value < v["min"]:
                errors.append(f"Property '{key}' must be >= {v['min']}")
            if "max" in v and isinstance(value, (int, float)) and value > v["max"]:
                errors.append(f"Property '{key}' must be <= {v['max']}")
            if "regex" in v and isinstance(value, str):
                if not re.match(v["regex"], value):
                    errors.append(f"Property '{key}' must match pattern {v['regex']}")

    return errors


async def bump_version(
    session: AsyncSession,
    object_type_id: UUID,
    tenant_id: str,
) -> tuple[int, bool]:
    """Increment version. Returns (new_version, is_breaking).
    Breaking = property deleted, type changed, required added on existing field.
    For now, all changes are considered non-breaking (caller handles breaking detection).
    """
    result = await session.execute(
        select(OntologyObjectTypeV2).where(
            OntologyObjectTypeV2.id == object_type_id,
            OntologyObjectTypeV2.tenant_id == tenant_id,
        )
    )
    ot = result.scalar_one_or_none()
    if ot is None:
        return (1, False)

    new_version = ot.version + 1
    ot.version = new_version
    return (new_version, False)


async def compute_impact(
    session: AsyncSession,
    object_type_id: UUID,
    tenant_id: str,
) -> dict:
    """Compute impact of changes: affected KPIs, lineage nodes, instance count."""
    # get object type api_name
    ot_result = await session.execute(
        select(OntologyObjectTypeV2).where(
            OntologyObjectTypeV2.id == object_type_id,
            OntologyObjectTypeV2.tenant_id == tenant_id,
        )
    )
    ot = ot_result.scalar_one_or_none()
    if ot is None:
        return {"kpi_definitions": [], "lineage_events": 0, "instance_count": 0, "link_types": []}

    api_name = ot.api_name

    # find KPI definitions referencing this object type
    kpi_result = await session.execute(
        select(KPIDefinition).where(
            KPIDefinition.tenant_id == tenant_id,
        )
    )
    kpi_defs = kpi_result.scalars().all()
    affected_kpis = []
    for kpi in kpi_defs:
        refs = kpi.input_objects or []
        formula = kpi.formula_expression or ""
        if api_name.lower() in formula.lower() or any(
            api_name.lower() in str(r).lower() for r in refs
        ):
            affected_kpis.append({
                "id": str(kpi.id),
                "kpi_code": kpi.kpi_code,
                "display_name": kpi.display_name,
            })

    # count lineage events referencing this object type
    lineage_count = (await session.execute(
        select(func.count(LineageEvent.id)).where(
            LineageEvent.tenant_id == tenant_id,
            LineageEvent.source_type == api_name,
        )
    )).scalar() or 0

    # count instances
    instance_count = (await session.execute(
        select(func.count(OntologyInstance.id)).where(
            OntologyInstance.tenant_id == tenant_id,
            OntologyInstance.object_type_id == object_type_id,
        )
    )).scalar() or 0

    # find link types
    lt_result = await session.execute(
        select(OntologyLinkType).where(
            OntologyLinkType.tenant_id == tenant_id,
            (OntologyLinkType.from_object_type_id == object_type_id) |
            (OntologyLinkType.to_object_type_id == object_type_id),
        )
    )
    link_types = [{
        "id": str(lt.id),
        "api_name": lt.api_name,
        "display_name": lt.display_name,
    } for lt in lt_result.scalars().all()]

    # find CustomKPI formulas referencing this object type
    custom_kpi_result = await session.execute(
        select(CustomKPI).where(CustomKPI.tenant_id == tenant_id)
    )
    custom_kpis = custom_kpi_result.scalars().all()
    affected_custom_kpis = []
    for ck in custom_kpis:
        formula = ck.formula or ""
        target = ck.target_object_type or ""
        if api_name.lower() in formula.lower() or api_name.lower() == target.lower():
            affected_custom_kpis.append({
                "id": str(ck.id),
                "api_name": ck.api_name,
                "display_name": ck.display_name,
            })

    # find Analysis specs referencing this object type
    analysis_result = await session.execute(
        select(Analysis).where(Analysis.tenant_id == tenant_id)
    )
    analyses = analysis_result.scalars().all()
    affected_analyses = []
    for a in analyses:
        spec_str = str(a.spec) if a.spec else ""
        if api_name.lower() in spec_str.lower():
            affected_analyses.append({
                "id": str(a.id),
                "name": a.name,
            })

    return {
        "kpi_definitions": affected_kpis,
        "lineage_events": lineage_count,
        "instance_count": instance_count,
        "link_types": link_types,
        "custom_kpis": affected_custom_kpis,
        "active_dashboards": affected_analyses,
    }
