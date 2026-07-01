"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { AgentNodeData } from "@/components/WorkflowBuilder";
import NodeOutputPanel from "@/components/nodes/NodeOutputPanel";
import NodeStatus from "@/components/nodes/NodeStatus";
import { PenTool, X } from "lucide-react";

export default function CopywriterNode({
  data,
  id,
  selected,
}: NodeProps<Node<AgentNodeData>>) {
  return (
    <article
      className={`w-72 overflow-hidden rounded-lg border bg-white shadow-lg transition ${
        selected ? "border-amber-500 ring-4 ring-amber-50" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-amber-600"
      />
      <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-amber-50 px-3 text-slate-900">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-amber-600" />
          <PenTool className="h-4 w-4 text-amber-700" aria-hidden="true" />
          <h3 className="text-xs font-semibold">
            {data.title ?? "Ad Copywriter"}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <NodeStatus status={data.status} />
          <button
            type="button"
            onClick={() => data.onDelete?.(id)}
            className="nodrag nopan flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-amber-100 hover:text-slate-900"
            aria-label="Delete copywriter node"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <NodeOutputPanel
          label="Ad Copy"
          result={data.result}
          fallback={
            <>
              <p className="text-slate-400">
                Ad copy will appear here after the workflow runs.
              </p>
            </>
          }
        />
        {data.error ? <p className="text-xs text-red-600">{data.error}</p> : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-amber-700"
      />
    </article>
  );
}
