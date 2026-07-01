"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { AgentNodeData } from "@/components/WorkflowBuilder";
import NodeOutputPanel from "@/components/nodes/NodeOutputPanel";
import NodeStatus from "@/components/nodes/NodeStatus";
import { Clapperboard, X } from "lucide-react";

export default function ScriptwriterNode({
  data,
  id,
  selected,
}: NodeProps<Node<AgentNodeData>>) {
  return (
    <article
      className={`w-72 overflow-hidden rounded-lg border bg-white shadow-lg transition ${
        selected ? "border-rose-400 ring-4 ring-rose-50" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-rose-500"
      />
      <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-rose-50 px-3 text-slate-900">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-rose-500" />
          <Clapperboard className="h-4 w-4 text-rose-600" aria-hidden="true" />
          <h3 className="text-xs font-semibold">Scriptwriter</h3>
        </div>
        <div className="flex items-center gap-2">
          <NodeStatus status={data.status} />
          <button
            type="button"
            onClick={() => data.onDelete?.(id)}
            className="nodrag nopan flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-rose-100 hover:text-slate-900"
            aria-label="Delete scriptwriter node"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="space-y-2 p-4 text-xs leading-5 text-slate-600">
        <NodeOutputPanel
          label="Script"
          result={data.result}
          fallback={
            <>
              <p className="text-slate-400">
                The script will be generated after the connected nodes run.
              </p>
            </>
          }
        />
        {data.error ? <p className="text-xs text-red-600">{data.error}</p> : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-rose-600"
      />
    </article>
  );
}
