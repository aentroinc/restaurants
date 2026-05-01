from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timezone
from uuid import UUID, uuid4
from app.models.workflow import WorkflowTemplate, WorkflowInstance, WorkflowEvent
from app.models.task import Task
from app.models.kpi import StoreDailyKPI
from app.models.store import Store


def evaluate_workflows(
    session: Session,
    tenant_id: str,
    as_of_date: date | None = None,
) -> dict:
    if as_of_date is None:
        as_of_date = date.today()

    tid = UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id

    # 1. Load active templates
    templates = session.execute(
        select(WorkflowTemplate).where(
            and_(WorkflowTemplate.tenant_id == tid, WorkflowTemplate.active == True)
        )
    ).scalars().all()

    if not templates:
        return {"templates_evaluated": 0, "stores_checked": 0, "workflows_triggered": 0, "tasks_created": 0, "instances_created": 0}

    # 2. Load latest KPIs with issues
    subq = (
        select(
            StoreDailyKPI.store_id,
            func.max(StoreDailyKPI.business_date).label("max_date"),
        )
        .where(StoreDailyKPI.tenant_id == tid)
        .group_by(StoreDailyKPI.store_id)
        .subquery()
    )
    kpis = session.execute(
        select(StoreDailyKPI)
        .join(subq, and_(
            StoreDailyKPI.store_id == subq.c.store_id,
            StoreDailyKPI.business_date == subq.c.max_date,
        ))
        .where(StoreDailyKPI.tenant_id == tid)
    ).scalars().all()

    # 3. Load stores for name lookup
    stores = session.execute(
        select(Store).where(Store.tenant_id == tid)
    ).scalars().all()
    store_map = {s.id: s for s in stores}

    # 4. Load existing active instances to dedup
    active_instances = session.execute(
        select(WorkflowInstance).where(
            and_(
                WorkflowInstance.tenant_id == tid,
                WorkflowInstance.status.in_(["running", "active"]),
            )
        )
    ).scalars().all()
    active_keys = {(str(wi.template_id), str(wi.related_object_id)) for wi in active_instances}

    workflows_triggered = 0
    tasks_created = 0
    instances_created = 0

    for template in templates:
        issue_type = template.issue_type
        for kpi in kpis:
            if not kpi.issue_types:
                continue

            has_issue = any(
                i.get("issue_type") == issue_type
                for i in (kpi.issue_types if isinstance(kpi.issue_types, list) else [])
            )
            if not has_issue:
                continue

            dedup_key = (str(template.id), str(kpi.store_id))
            if dedup_key in active_keys:
                continue

            store = store_map.get(kpi.store_id)
            store_name = store.name if store else "不明"

            # Create WorkflowInstance
            instance_id = uuid4()
            instance = WorkflowInstance(
                id=instance_id,
                tenant_id=tid,
                template_id=template.id,
                related_object_type="store",
                related_object_id=kpi.store_id,
                status="active",
                current_step=0,
            )
            session.add(instance)

            # Event: triggered
            session.add(WorkflowEvent(
                id=uuid4(),
                workflow_instance_id=instance_id,
                event_type="triggered",
                payload={
                    "issue_type": issue_type,
                    "store_name": store_name,
                    "labor_cost_rate": float(kpi.labor_cost_rate) if kpi.labor_cost_rate else None,
                    "cogs_rate": float(kpi.cogs_rate) if kpi.cogs_rate else None,
                    "business_date": kpi.business_date.isoformat(),
                },
            ))

            # Find issue details for impact
            issue_detail = next(
                (i for i in kpi.issue_types if i.get("issue_type") == issue_type), {}
            )

            # Create Task
            title_map = {
                "labor_overrun": f"人件費率改善: {store_name}",
                "cogs_overrun": f"原価率改善: {store_name}",
                "review_decline": f"口コミ改善: {store_name}",
                "sales_decline": f"売上回復: {store_name}",
                "discount_overuse": f"割引適正化: {store_name}",
            }
            task_id = uuid4()
            task = Task(
                id=task_id,
                tenant_id=tid,
                store_id=kpi.store_id,
                title=title_map.get(issue_type, f"改善タスク: {store_name}"),
                description=f"ワークフロー自動生成: {template.name}",
                issue_type=issue_type,
                status="open",
                priority="high" if issue_detail.get("severity") == "high" else "medium",
                source="workflow",
                related_workflow_id=instance_id,
                expected_impact_amount=issue_detail.get("impact_amount"),
            )
            session.add(task)

            # Event: task_created
            session.add(WorkflowEvent(
                id=uuid4(),
                workflow_instance_id=instance_id,
                event_type="task_created",
                payload={"task_id": str(task_id), "task_title": task.title},
            ))

            active_keys.add(dedup_key)
            workflows_triggered += 1
            tasks_created += 1
            instances_created += 1

    session.commit()

    return {
        "templates_evaluated": len(templates),
        "stores_checked": len(kpis),
        "workflows_triggered": workflows_triggered,
        "tasks_created": tasks_created,
        "instances_created": instances_created,
    }


async def evaluate_workflows_async(
    session: AsyncSession,
    tenant_id: str,
    as_of_date: date | None = None,
) -> dict:
    if as_of_date is None:
        as_of_date = date.today()

    tid = UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id

    templates_result = await session.execute(
        select(WorkflowTemplate).where(
            and_(WorkflowTemplate.tenant_id == tid, WorkflowTemplate.active == True)
        )
    )
    templates = templates_result.scalars().all()

    if not templates:
        return {"templates_evaluated": 0, "stores_checked": 0, "workflows_triggered": 0, "tasks_created": 0, "instances_created": 0}

    subq = (
        select(
            StoreDailyKPI.store_id,
            func.max(StoreDailyKPI.business_date).label("max_date"),
        )
        .where(StoreDailyKPI.tenant_id == tid)
        .group_by(StoreDailyKPI.store_id)
        .subquery()
    )
    kpis_result = await session.execute(
        select(StoreDailyKPI)
        .join(subq, and_(
            StoreDailyKPI.store_id == subq.c.store_id,
            StoreDailyKPI.business_date == subq.c.max_date,
        ))
        .where(StoreDailyKPI.tenant_id == tid)
    )
    kpis = kpis_result.scalars().all()

    stores_result = await session.execute(
        select(Store).where(Store.tenant_id == tid)
    )
    store_map = {s.id: s for s in stores_result.scalars().all()}

    active_result = await session.execute(
        select(WorkflowInstance).where(
            and_(
                WorkflowInstance.tenant_id == tid,
                WorkflowInstance.status.in_(["running", "active"]),
            )
        )
    )
    active_keys = {(str(wi.template_id), str(wi.related_object_id)) for wi in active_result.scalars().all()}

    workflows_triggered = 0
    tasks_created = 0
    instances_created = 0

    for template in templates:
        issue_type = template.issue_type
        for kpi in kpis:
            if not kpi.issue_types:
                continue
            has_issue = any(
                i.get("issue_type") == issue_type
                for i in (kpi.issue_types if isinstance(kpi.issue_types, list) else [])
            )
            if not has_issue:
                continue

            dedup_key = (str(template.id), str(kpi.store_id))
            if dedup_key in active_keys:
                continue

            store = store_map.get(kpi.store_id)
            store_name = store.name if store else "不明"

            instance_id = uuid4()
            instance = WorkflowInstance(
                id=instance_id,
                tenant_id=tid,
                template_id=template.id,
                related_object_type="store",
                related_object_id=kpi.store_id,
                status="active",
                current_step=0,
            )
            session.add(instance)

            session.add(WorkflowEvent(
                id=uuid4(),
                workflow_instance_id=instance_id,
                event_type="triggered",
                payload={
                    "issue_type": issue_type,
                    "store_name": store_name,
                    "labor_cost_rate": float(kpi.labor_cost_rate) if kpi.labor_cost_rate else None,
                    "cogs_rate": float(kpi.cogs_rate) if kpi.cogs_rate else None,
                    "business_date": kpi.business_date.isoformat(),
                },
            ))

            issue_detail = next(
                (i for i in kpi.issue_types if i.get("issue_type") == issue_type), {}
            )

            title_map = {
                "labor_overrun": f"人件費率改善: {store_name}",
                "cogs_overrun": f"原価率改善: {store_name}",
                "review_decline": f"口コミ改善: {store_name}",
                "sales_decline": f"売上回復: {store_name}",
                "discount_overuse": f"割引適正化: {store_name}",
            }
            task_id = uuid4()
            task = Task(
                id=task_id,
                tenant_id=tid,
                store_id=kpi.store_id,
                title=title_map.get(issue_type, f"改善タスク: {store_name}"),
                description=f"ワークフロー自動生成: {template.name}",
                issue_type=issue_type,
                status="open",
                priority="high" if issue_detail.get("severity") == "high" else "medium",
                source="workflow",
                related_workflow_id=instance_id,
                expected_impact_amount=issue_detail.get("impact_amount"),
            )
            session.add(task)

            session.add(WorkflowEvent(
                id=uuid4(),
                workflow_instance_id=instance_id,
                event_type="task_created",
                payload={"task_id": str(task_id), "task_title": task.title},
            ))

            active_keys.add(dedup_key)
            workflows_triggered += 1
            tasks_created += 1
            instances_created += 1

    await session.commit()

    return {
        "templates_evaluated": len(templates),
        "stores_checked": len(kpis),
        "workflows_triggered": workflows_triggered,
        "tasks_created": tasks_created,
        "instances_created": instances_created,
    }


async def advance_workflow(session: AsyncSession, instance_id: str, actor_id: str = None) -> dict:
    iid = UUID(instance_id) if isinstance(instance_id, str) else instance_id
    result = await session.execute(
        select(WorkflowInstance).where(WorkflowInstance.id == iid)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        return {"error": "Instance not found"}

    if instance.status not in ("active", "running"):
        return {"error": "Instance is not active", "status": instance.status}

    # Load template for step info
    tmpl_result = await session.execute(
        select(WorkflowTemplate).where(WorkflowTemplate.id == instance.template_id)
    )
    template = tmpl_result.scalar_one_or_none()
    steps = template.steps if template and template.steps else []
    total_steps = len(steps)

    next_step = instance.current_step + 1
    if next_step >= total_steps:
        return await complete_workflow(session, instance_id, actor_id)

    instance.current_step = next_step

    step_info = steps[next_step] if next_step < len(steps) else {}
    session.add(WorkflowEvent(
        id=uuid4(),
        workflow_instance_id=instance.id,
        event_type="step_advanced",
        actor_id=UUID(actor_id) if actor_id else None,
        payload={
            "step": next_step,
            "action": step_info.get("action"),
            "description": step_info.get("description"),
        },
    ))

    await session.commit()
    return {
        "instance_id": str(instance.id),
        "current_step": next_step,
        "total_steps": total_steps,
        "status": instance.status,
    }


async def complete_workflow(session: AsyncSession, instance_id: str, actor_id: str = None) -> dict:
    iid = UUID(instance_id) if isinstance(instance_id, str) else instance_id
    result = await session.execute(
        select(WorkflowInstance).where(WorkflowInstance.id == iid)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        return {"error": "Instance not found"}

    instance.status = "completed"
    instance.completed_at = datetime.now(timezone.utc)

    session.add(WorkflowEvent(
        id=uuid4(),
        workflow_instance_id=instance.id,
        event_type="completed",
        actor_id=UUID(actor_id) if actor_id else None,
        payload={"completed_at": instance.completed_at.isoformat()},
    ))

    await session.commit()
    return {
        "instance_id": str(instance.id),
        "status": "completed",
        "completed_at": instance.completed_at.isoformat(),
    }


async def get_workflow_status(session: AsyncSession, tenant_id: str) -> dict:
    tid = UUID(tenant_id) if isinstance(tenant_id, str) else tenant_id

    active_count = (await session.execute(
        select(func.count(WorkflowInstance.id)).where(
            and_(WorkflowInstance.tenant_id == tid, WorkflowInstance.status.in_(["active", "running"]))
        )
    )).scalar() or 0

    completed_count = (await session.execute(
        select(func.count(WorkflowInstance.id)).where(
            and_(WorkflowInstance.tenant_id == tid, WorkflowInstance.status == "completed")
        )
    )).scalar() or 0

    # Tasks created by workflow this month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    tasks_this_month = (await session.execute(
        select(func.count(Task.id)).where(
            and_(Task.tenant_id == tid, Task.source == "workflow", Task.created_at >= month_start)
        )
    )).scalar() or 0

    # Top triggered templates
    top_templates_result = await session.execute(
        select(
            WorkflowTemplate.name,
            func.count(WorkflowInstance.id).label("count"),
        )
        .join(WorkflowInstance, WorkflowInstance.template_id == WorkflowTemplate.id)
        .where(WorkflowInstance.tenant_id == tid)
        .group_by(WorkflowTemplate.name)
        .order_by(func.count(WorkflowInstance.id).desc())
        .limit(5)
    )
    top_templates = [{"name": row[0], "count": row[1]} for row in top_templates_result.all()]

    return {
        "active_count": active_count,
        "completed_count": completed_count,
        "tasks_created_this_month": tasks_this_month,
        "top_triggered_templates": top_templates,
    }
