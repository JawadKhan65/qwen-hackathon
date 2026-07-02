import MarkdownOutput from "@/components/nodes/MarkdownOutput";

type NodeOutputPanelProps = {
  label: string;
  result?: unknown;
  streamingText?: string;
  fallback: React.ReactNode;
};

function resultText(result: unknown): string | undefined {
  if (typeof result === "string") {
    return result;
  }

  if (result && typeof result === "object") {
    const value = (result as Record<string, unknown>).rationale;
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}

export default function NodeOutputPanel({
  label,
  result,
  streamingText,
  fallback,
}: NodeOutputPanelProps) {
  const text = resultText(result);

  // Final result — full markdown render
  if (text && text.trim().length > 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {label}
          </span>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            Rendered
          </span>
        </div>
        <div className="max-h-56 overflow-auto rounded-md bg-slate-50 px-3 py-2">
          <MarkdownOutput value={text} />
        </div>
      </div>
    );
  }

  // Streaming — ChatGPT-style token accumulation with blinking cursor
  if (streamingText && streamingText.trim().length > 0) {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">
            {label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500" />
            Writing...
          </span>
        </div>
        <div className="max-h-56 overflow-auto rounded-md bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 font-mono whitespace-pre-wrap">
          {streamingText}
          <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-[blink_1s_step-end_infinite] bg-sky-500 align-text-bottom" />
        </div>
      </div>
    );
  }

  return <>{fallback}</>;
}
