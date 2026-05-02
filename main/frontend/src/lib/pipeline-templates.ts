import type { PipelineDef, PipelineRun, PipelineSchedule, PipelineBranch } from "./pipeline-api"

const NOW = "2026-05-02T03:00:00Z"

export const mockPipelines: PipelineDef[] = [
  {
    id: "pl_daily_pos",
    name: "日次POS取込",
    description: "全店 POS 売上を日次で取込・検証・writeback",
    status: "active",
    branch: "main",
    schedule: "0 3 * * *",
    last_run_at: "2026-05-02T03:14:00Z",
    last_run_status: "success",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    nodes: [
      {
        id: "n_fetch",
        type: "connector_fetch",
        label: "POS API 取込",
        position: { x: 80, y: 120 },
        config: {
          connector_id: "pos_zensho_v2",
          endpoint: "/v2/sales/daily",
          auth: "oauth2",
          target_dataset: "raw_pos_daily",
        },
      },
      {
        id: "n_validate",
        type: "validate",
        label: "POS 行検証",
        position: { x: 380, y: 120 },
        config: {
          rules: [
            { field: "store_code", check: "not_null" },
            { field: "gross_sales", check: "range", min: 0, max: 100000000 },
            { field: "business_date", check: "format:YYYY-MM-DD" },
          ],
          on_failure: "quarantine",
        },
      },
      {
        id: "n_writeback",
        type: "writeback",
        label: "canonical 反映",
        position: { x: 680, y: 120 },
        config: {
          target_dataset: "daily_store_sales",
          mode: "append",
          partition_by: "business_date",
        },
      },
    ],
    edges: [
      { id: "e1", source: "n_fetch", target: "n_validate" },
      { id: "e2", source: "n_validate", target: "n_writeback" },
    ],
  },
  {
    id: "pl_kpi_agg",
    name: "KPI集計",
    description: "日次 KPI → 月次 KPI を集計し executive_kpi へ書き戻し",
    status: "active",
    branch: "main",
    schedule: "30 3 * * *",
    last_run_at: "2026-05-02T03:34:00Z",
    last_run_status: "success",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    nodes: [
      {
        id: "n_daily_kpi",
        type: "transform_sql",
        label: "daily_kpi 計算",
        position: { x: 80, y: 120 },
        config: {
          target_dataset: "daily_kpi",
          sql: "SELECT business_date, store_id, SUM(gross_sales) AS sales, AVG(transactions) AS avg_tx FROM daily_store_sales GROUP BY 1,2",
        },
      },
      {
        id: "n_monthly_kpi",
        type: "transform_sql",
        label: "monthly_kpi 集計",
        position: { x: 380, y: 120 },
        config: {
          target_dataset: "monthly_kpi",
          sql: "SELECT DATE_TRUNC('month', business_date) AS ym, store_id, SUM(sales) AS m_sales FROM daily_kpi GROUP BY 1,2",
        },
      },
      {
        id: "n_writeback_kpi",
        type: "writeback",
        label: "executive_kpi へ反映",
        position: { x: 680, y: 120 },
        config: {
          target_dataset: "executive_kpi",
          mode: "upsert",
          key: ["ym", "store_id"],
        },
      },
    ],
    edges: [
      { id: "e1", source: "n_daily_kpi", target: "n_monthly_kpi" },
      { id: "e2", source: "n_monthly_kpi", target: "n_writeback_kpi" },
    ],
  },
  {
    id: "pl_labor_compliance",
    name: "労務コンプライアンスチェック",
    description: "シフトデータから法令違反をチェックし、検出時に通知書き戻し",
    status: "active",
    branch: "main",
    schedule: "0 6 * * *",
    last_run_at: "2026-05-02T06:02:00Z",
    last_run_status: "failed",
    created_at: "2026-04-15T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
    nodes: [
      {
        id: "n_compute",
        type: "transform_sql",
        label: "労務指標 計算",
        position: { x: 80, y: 120 },
        config: {
          target_dataset: "labor_metrics_daily",
          sql: "SELECT employee_id, store_id, business_date, SUM(work_minutes) AS work_min, MAX(consecutive_days) AS streak FROM shift_records GROUP BY 1,2,3",
        },
      },
      {
        id: "n_validate_law",
        type: "validate",
        label: "労基法チェック",
        position: { x: 380, y: 120 },
        config: {
          rules: [
            { field: "work_min", check: "lte", threshold: 540 },
            { field: "streak", check: "lte", threshold: 6 },
          ],
          on_failure: "emit_violation",
        },
      },
      {
        id: "n_notify",
        type: "writeback",
        label: "違反通知 (Slack + writeback)",
        position: { x: 680, y: 120 },
        config: {
          target_dataset: "labor_violations",
          mode: "append",
          notify_channel: "#labor-alerts",
        },
      },
    ],
    edges: [
      { id: "e1", source: "n_compute", target: "n_validate_law" },
      { id: "e2", source: "n_validate_law", target: "n_notify" },
    ],
  },
]

export const mockPipelineRuns: PipelineRun[] = [
  {
    id: "run_001",
    pipeline_id: "pl_daily_pos",
    branch: "main",
    status: "success",
    started_at: "2026-05-02T03:00:00Z",
    finished_at: "2026-05-02T03:14:00Z",
    duration_ms: 840000,
    triggered_by: "schedule",
    node_runs: [
      { node_id: "n_fetch", status: "success", started_at: "2026-05-02T03:00:00Z", finished_at: "2026-05-02T03:08:00Z", duration_ms: 480000, rows_processed: 76123, log: "fetched 76123 rows from pos_zensho_v2" },
      { node_id: "n_validate", status: "success", started_at: "2026-05-02T03:08:00Z", finished_at: "2026-05-02T03:11:00Z", duration_ms: 180000, rows_processed: 76123, log: "validated. 0 quarantined." },
      { node_id: "n_writeback", status: "success", started_at: "2026-05-02T03:11:00Z", finished_at: "2026-05-02T03:14:00Z", duration_ms: 180000, rows_processed: 76123, log: "appended to daily_store_sales" },
    ],
  },
  {
    id: "run_002",
    pipeline_id: "pl_daily_pos",
    branch: "main",
    status: "failed",
    started_at: "2026-05-01T03:00:00Z",
    finished_at: "2026-05-01T03:09:00Z",
    duration_ms: 540000,
    triggered_by: "schedule",
    node_runs: [
      { node_id: "n_fetch", status: "success", started_at: "2026-05-01T03:00:00Z", finished_at: "2026-05-01T03:08:00Z", duration_ms: 480000, rows_processed: 75890, log: "fetched 75890 rows" },
      { node_id: "n_validate", status: "failed", started_at: "2026-05-01T03:08:00Z", finished_at: "2026-05-01T03:09:00Z", duration_ms: 60000, rows_processed: 75890, error: "1247 rows violated range check on gross_sales (negative values)" },
      { node_id: "n_writeback", status: "skipped" },
    ],
  },
  {
    id: "run_003",
    pipeline_id: "pl_kpi_agg",
    branch: "main",
    status: "success",
    started_at: "2026-05-02T03:30:00Z",
    finished_at: "2026-05-02T03:34:00Z",
    duration_ms: 240000,
    triggered_by: "schedule",
    node_runs: [
      { node_id: "n_daily_kpi", status: "success", duration_ms: 90000, rows_processed: 1230, log: "computed daily_kpi" },
      { node_id: "n_monthly_kpi", status: "success", duration_ms: 60000, rows_processed: 41, log: "computed monthly_kpi" },
      { node_id: "n_writeback_kpi", status: "success", duration_ms: 90000, rows_processed: 41, log: "upserted executive_kpi" },
    ],
  },
  {
    id: "run_004",
    pipeline_id: "pl_labor_compliance",
    branch: "main",
    status: "failed",
    started_at: "2026-05-02T06:00:00Z",
    finished_at: "2026-05-02T06:02:00Z",
    duration_ms: 120000,
    triggered_by: "schedule",
    node_runs: [
      { node_id: "n_compute", status: "success", duration_ms: 60000, rows_processed: 28432, log: "computed labor_metrics_daily" },
      { node_id: "n_validate_law", status: "failed", duration_ms: 60000, rows_processed: 28432, error: "47 違反検出: 12名が法定上限超過" },
      { node_id: "n_notify", status: "skipped" },
    ],
  },
]

export const mockPipelineSchedules: PipelineSchedule[] = [
  { id: "sch_pos_daily", pipeline_id: "pl_daily_pos", cron: "0 3 * * *", branch: "main", enabled: true, next_run_at: "2026-05-03T03:00:00Z", description: "毎日 3:00 (POS 取込)" },
  { id: "sch_kpi_daily", pipeline_id: "pl_kpi_agg", cron: "30 3 * * *", branch: "main", enabled: true, next_run_at: "2026-05-03T03:30:00Z", description: "毎日 3:30 (KPI 集計)" },
  { id: "sch_labor_daily", pipeline_id: "pl_labor_compliance", cron: "0 6 * * *", branch: "main", enabled: true, next_run_at: "2026-05-03T06:00:00Z", description: "毎日 6:00 (労務チェック)" },
]

export const mockPipelineBranches: PipelineBranch[] = [
  { name: "main", base: "main", created_at: "2026-04-01T00:00:00Z", created_by: "system" },
  { name: "feat/add-discount-handling", base: "main", created_at: "2026-04-28T00:00:00Z", created_by: "doohyw@gmail.com", diff_count: 2 },
]

export { NOW }
