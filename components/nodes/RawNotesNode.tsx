"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { AgentNodeData } from "@/components/WorkflowBuilder";
import NodeOutputPanel from "@/components/nodes/NodeOutputPanel";
import NodeStatus from "@/components/nodes/NodeStatus";
import { FileText, X } from "lucide-react";
import { useState } from "react";

export default function RawNotesNode({
  data,
  id,
  selected,
}: NodeProps<Node<AgentNodeData>>) {
  const [notesValue, setNotesValue] = useState(data.notes ?? data.text ?? "");

  return (
    <article
      className={`w-72 overflow-hidden rounded-lg border bg-white shadow-lg transition ${
        selected ? "border-slate-400 ring-4 ring-slate-100" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-500"
      />
      <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-slate-50 px-3 text-slate-900">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-slate-500" />
          <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h3 className="text-xs font-semibold">Product Brief</h3>
        </div>
        <div className="flex items-center gap-2">
          <NodeStatus status={data.status} />
          <button
            type="button"
            onClick={() => data.onDelete?.(id)}
            className="nodrag nopan flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-900"
            aria-label="Delete raw notes node"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="space-y-3 p-4 text-xs leading-5 text-slate-600">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Minimal Context
          </span>
          <textarea
            value={notesValue}
            onChange={(event) => {
              setNotesValue(event.target.value);
              data.onChange?.({ notes: event.target.value, text: event.target.value });
            }}
            placeholder="Product name, target buyer, key benefit, offer or launch goal. Optional."
            rows={5}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <NodeOutputPanel
          label="Launch Brief"
          result={data.result}
          fallback={
            <>
              <p className="text-slate-400">
                Add only what the image cannot reveal. The society will infer the rest.
              </p>
            </>
          }
        />
        {data.error ? <p className="text-xs text-red-600">{data.error}</p> : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-slate-600"
      />
    </article>
  );
}
