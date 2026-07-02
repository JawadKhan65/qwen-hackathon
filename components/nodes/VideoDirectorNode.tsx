"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { AgentNodeData } from "@/lib/types";
import MediaDownloadLink from "@/components/nodes/MediaDownloadLink";
import NodeStatus from "@/components/nodes/NodeStatus";
import { getMediaResultUrl } from "@/components/nodes/media-result";
import { Video, X } from "lucide-react";

export default function VideoDirectorNode({
  data,
  id,
  selected,
}: NodeProps<Node<AgentNodeData>>) {
  const videoUrl = getMediaResultUrl(data.result, "videoUrl");

  return (
    <article
      className={`w-64 overflow-hidden rounded-lg border bg-white shadow-lg transition ${
        selected ? "border-zinc-400 ring-4 ring-zinc-100" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white !bg-zinc-500"
      />
      <div className="flex h-10 items-center justify-between border-b border-slate-200 bg-zinc-50 px-3 text-slate-900">
        <div className="flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-zinc-500" />
          <Video className="h-4 w-4 text-zinc-600" aria-hidden="true" />
          <h3 className="text-xs font-semibold">Video Director</h3>
        </div>
        <div className="flex items-center gap-2">
          <NodeStatus status={data.status} />
          <button
            type="button"
            onClick={() => data.onDelete?.(id)}
            className="nodrag nopan flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-zinc-200 hover:text-slate-900"
            aria-label="Delete video director node"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="p-3">
        <div className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {videoUrl ? (
            <>
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                className="h-full w-full rounded object-cover"
              />
              <div className="absolute bottom-2 right-2">
                <MediaDownloadLink
                  filename="launchgrid-product-video.mp4"
                  label="Download"
                  tone="dark"
                  url={videoUrl}
                />
              </div>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-xs leading-5 text-slate-400">
              Awaiting the lifestyle image before generating motion.
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
        className="!h-3 !w-3 !border-2 !border-white !bg-zinc-600"
      />
    </article>
  );
}
