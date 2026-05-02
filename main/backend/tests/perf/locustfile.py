"""Locust load test for the AENTRO API.

Run from inside the container or with the API exposed:

    locust -f tests/perf/locustfile.py --host http://localhost:8000 \
           --users 200 --spawn-rate 20 --run-time 5m --headless

Targets in tests/perf/targets.yaml. CI gates on regression > 20%.
"""
import os
import random
from datetime import date, timedelta

try:
    from locust import HttpUser, between, task  # type: ignore
except ImportError:  # locust optional in dev
    HttpUser = object  # type: ignore
    def task(*a, **k): return lambda f: f  # type: ignore
    def between(*a, **k): return None  # type: ignore


class ExecutiveUser(HttpUser):  # type: ignore[misc]
    wait_time = between(1, 4)
    auth_token = os.environ.get("LOCUST_TOKEN", "")

    def on_start(self):
        self.client.headers.update({"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else {})

    @task(5)
    def executive_summary(self):
        self.client.get("/api/v1/executive/summary", name="exec/summary")

    @task(3)
    def store_ranking(self):
        self.client.get("/api/v1/stores/ranking?limit=10", name="stores/ranking")

    @task(2)
    def workspace_preview(self):
        body = {
            "formula": "({net_sales} - {cogs}) / {net_sales}",
            "target_object_type": "Store",
            "aggregation_axis": ["month"],
        }
        self.client.post(
            "/api/v1/workspace-engine/preview-formula", json=body,
            name="workspace/preview",
        )

    @task(2)
    def cohort(self):
        body = {"spec": {
            "object_type": "Store",
            "and": [{"property": "trade_area_type", "op": "==", "value": "駅前"}],
        }}
        self.client.post(
            "/api/v1/workspace-engine/run-cohort", json=body,
            name="workspace/cohort",
        )

    @task(1)
    def kpi_query(self):
        end = date.today()
        start = end - timedelta(days=30)
        self.client.get(
            f"/api/v1/kpi-engine/store-daily?from={start}&to={end}&limit=50",
            name="kpi/store-daily",
        )
