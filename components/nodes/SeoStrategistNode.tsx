"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { AgentNodeData } from "@/lib/types";
import NodeOutputPanel from "@/components/nodes/NodeOutputPanel";
import NodeStatus from "@/components/nodes/NodeStatus";
import { Search, X } from "lucide-react";

export default function SeoStrategistNode({
  data,
  id,
  selected,
}: NodeProps<Node<AgentNodeData>>) {
  return (
    <article
      className={`w-72 overflow-hidden rounded-lg border bg-white shadow-lg transition ${
        selected ? "border-teal-500 ring-4 ring-teal-50" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-teal-600"
      />
      <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-teal-50 px-3 text-slate-900">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-teal-600" />
          <Search className="h-4 w-4 text-teal-700" aria-hidden="true" />
          <h3 className="text-xs font-semibold">SEO Strategist</h3>
        </div>
        <div className="flex items-center gap-2">
          <NodeStatus status={data.status} />
          <button
            type="button"
            onClick={() => data.onDelete?.(id)}
            className="nodrag nopan flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-teal-100 hover:text-slate-900"
            aria-label="Delete SEO strategist node"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <NodeOutputPanel
          label="SEO Copy"
          result={data.result}
          streamingText={data.streamingText}
          fallback={
            <>
              <p className="text-slate-400">
                SEO outputs will appear here after execution.
              </p>
            </>
          }
        />
        {data.error ? <p className="text-xs text-red-600">{data.error}</p> : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-teal-700"
      />
    </article>
  );
}
