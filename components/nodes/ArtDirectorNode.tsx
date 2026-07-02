"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { AgentNodeData } from "@/lib/types";
import MediaDownloadLink from "@/components/nodes/MediaDownloadLink";
import NodeStatus from "@/components/nodes/NodeStatus";
import { getMediaResultUrl } from "@/components/nodes/media-result";
import { Palette, X } from "lucide-react";

export default function ArtDirectorNode({
  data,
  id,
  selected,
}: NodeProps<Node<AgentNodeData>>) {
  const imageUrl = getMediaResultUrl(data.result, "imageUrl");

  return (
    <article
      className={`w-64 overflow-hidden rounded-lg border bg-white shadow-lg transition ${
        selected ? "border-purple-300 ring-4 ring-purple-50" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-purple-400"
      />
      <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-purple-50 px-3 text-slate-900">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-purple-400" />
          <Palette className="h-4 w-4 text-purple-600" aria-hidden="true" />
          <h3 className="text-xs font-semibold">Art Director</h3>
        </div>
        <div className="flex items-center gap-2">
          <NodeStatus status={data.status} />
          <button
            type="button"
            onClick={() => data.onDelete?.(id)}
            className="nodrag nopan flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-purple-100 hover:text-slate-900"
            aria-label="Delete art director node"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Generated lifestyle image"
                className="h-full w-full object-cover"
              />
              <div className="absolute bottom-2 right-2">
                <MediaDownloadLink
                  filename="launchgrid-lifestyle-image.png"
                  label="Download HQ"
                  url={imageUrl}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs leading-5 text-slate-400">
              Awaiting a product image from upstream input.
            </div>
          )}
        </div>
        {data.error ? (
          <p className="mt-3 text-xs text-red-600">{data.error}</p>
        ) : null}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-white !bg-purple-500"
      />
    </article>
  );
}
