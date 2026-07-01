import MarkdownOutput from "@/components/nodes/MarkdownOutput";

type NodeOutputPanelProps = {
  label: string;
  result?: unknown;
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
  fallback,
}: NodeOutputPanelProps) {
  const text = resultText(result);

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

  return <>{fallback}</>;
}
