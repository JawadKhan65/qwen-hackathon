"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { AgentNodeData } from "@/components/WorkflowBuilder";
import NodeStatus from "@/components/nodes/NodeStatus";
import { Upload, X } from "lucide-react";
import { useState } from "react";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/bmp",
  "image/tiff",
  "image/webp",
  "image/gif",
]);

export default function ProductImageNode({
  data,
  id,
  selected,
}: NodeProps<Node<AgentNodeData>>) {
  const [inputValue, setInputValue] = useState(data.imageUrl ?? "");
  const [inputError, setInputError] = useState<string | null>(null);

  const previewUrl = data.result ?? data.imageUrl;

  return (
    <article
      className={`w-64 overflow-hidden rounded-lg border bg-white shadow-lg transition ${
        selected ? "border-stone-400 ring-4 ring-stone-100" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-stone-500"
      />
      <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-stone-50 px-3 text-slate-900">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-stone-500" />
          <Upload className="h-4 w-4 text-stone-600" aria-hidden="true" />
          <h3 className="text-xs font-semibold">Product Image</h3>
        </div>
        <div className="flex items-center gap-2">
          <NodeStatus status={data.status} />
          <button
            type="button"
            onClick={() => data.onDelete?.(id)}
            className="nodrag nopan flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-stone-200 hover:text-slate-900"
            aria-label="Delete product image node"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            {typeof previewUrl === "string" && previewUrl.length > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Product image preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs leading-5 text-slate-400">
                Upload a product image or paste a URL to seed the workflow.
              </div>
            )}
          </div>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Product Image URL
            </span>
            <input
              value={inputValue}
              onChange={(event) => {
                setInputValue(event.target.value);
                setInputError(null);
                data.onChange?.({ imageUrl: event.target.value });
              }}
              placeholder="https://..."
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100">
            <Upload className="h-4 w-4" aria-hidden="true" />
            Upload image
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
                  setInputError("Use JPG, PNG, BMP, TIFF, WEBP, or GIF.");
                  return;
                }

                if (file.size > MAX_IMAGE_BYTES) {
                  setInputError("Image must be 10 MB or smaller.");
                  return;
                }

                const reader = new FileReader();
                reader.onload = () => {
                  const value = typeof reader.result === "string" ? reader.result : "";
                  setInputValue(value);
                  setInputError(null);
                  data.onChange?.({ imageUrl: value });
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {inputError ? <p className="text-xs text-red-600">{inputError}</p> : null}
        </div>
        {data.error ? (
          <p className="mt-3 text-xs text-red-600">{data.error}</p>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-stone-600"
      />
    </article>
  );
}
