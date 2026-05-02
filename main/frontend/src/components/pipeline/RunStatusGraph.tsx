"use client"

import { PipelineCanvas } from "./PipelineCanvas"
import type { PipelineNode, PipelineEdge, PipelineRun } from "@/lib/pipeline-api"

interface Props {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  run: PipelineRun
  height?: number
}

export function RunStatusGraph({ nodes, edges, run, height = 240 }: Props) {
  const statusMap: Record<string, "success" | "failed" | "running" | "skipped" | "pending"> = {}
  run.node_runs.forEach((nr) => { statusMap[nr.node_id] = nr.status })

  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#0a0e14] overflow-hidden" style={{ height }}>
      <PipelineCanvas
        nodes={nodes}
        edges={edges}
        selectedNodeId={null}
        onSelectNode={() => {}}
        onMoveNode={() => {}}
        onAddNode={() => {}}
        onDeleteNode={() => {}}
        onConnect={() => {}}
        onDeleteEdge={() => {}}
        readOnly
        nodeStatusMap={statusMap}
      />
    </div>
  )
}
