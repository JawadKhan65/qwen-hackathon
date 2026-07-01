"use client";

import { Brain, CheckCircle2, GitMerge, MessageSquareQuote, Radio, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";

export const defaultLogEntries = ["> [System] Pipeline initialized."];

type SocietyLogProps = {
  entries?: string[];
};

type EntryKind = "thinking" | "suggestion" | "consensus" | "complete" | "error" | "system";

function entryKind(message: string): EntryKind {
  const lower = message.toLowerCase();

  if (lower.includes("error") || lower.includes("failed")) return "error";
  if (
    lower.includes("consensus") ||
    lower.includes("resolved") ||
    lower.includes("selected") ||
    lower.includes("voted")
  ) {
    return "consensus";
  }
  if (
    lower.includes("suggested") ||
    lower.includes("nominated") ||
    lower.includes("recommended") ||
    lower.includes("picked")
  ) {
    return "suggestion";
  }
  if (lower.includes("completed") || lower.includes("handed off")) return "complete";
  if (
    lower.includes("thinking") ||
    lower.includes("started") ||
    lower.includes("auditing") ||
    lower.includes("checking") ||
    lower.includes("comparing") ||
    lower.includes("challenging") ||
    lower.includes("reviewing") ||
    lower.includes("testing") ||
    lower.includes("translating") ||
    lower.includes("extracting") ||
    lower.includes("mapping") ||
    lower.includes("reconciling")
  ) {
    return "thinking";
  }

  return "system";
}

function kindStyles(kind: EntryKind): { tone: string; label: string; Icon: typeof Brain } {
  if (kind === "error") {
    return {
      Icon: TriangleAlert,
      label: "needs attention",
      tone: "border-red-400/25 bg-red-400/[0.08] text-red-100",
    };
  }

  if (kind === "consensus") {
    return {
      Icon: GitMerge,
      label: "consensus",
      tone: "border-fuchsia-300/25 bg-fuchsia-300/[0.08] text-fuchsia-100",
    };
  }

  if (kind === "suggestion") {
    return {
      Icon: MessageSquareQuote,
      label: "suggestion",
      tone: "border-amber-300/25 bg-amber-300/[0.08] text-amber-100",
    };
  }

  if (kind === "complete") {
    return {
      Icon: CheckCircle2,
      label: "complete",
      tone: "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100",
    };
  }

  if (kind === "thinking") {
    return {
      Icon: Brain,
      label: "thinking",
      tone: "border-sky-300/25 bg-sky-300/[0.08] text-sky-100",
    };
  }

  return {
    Icon: Sparkles,
    label: "system",
    tone: "border-slate-400/20 bg-white/[0.04] text-slate-200",
  };
}

function parseEntry(entry: string): { role: string; message: string; kind: EntryKind } {
  const match = entry.match(/^>\s+\[([^\]]+)]\s*(.*)$/);
  const role = match?.[1] ?? "Society";
  const message = match?.[2] ?? entry;

  return { role, message, kind: entryKind(message) };
}

export default function SocietyLog({ entries = defaultLogEntries }: SocietyLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeCount = entries.filter((entry) => entryKind(entry) === "thinking").length;

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    element.scrollTop = element.scrollHeight;
  }, [entries]);

  return (
    <section className="flex h-[280px] shrink-0 flex-col border-t border-slate-800 bg-[#07111f] text-slate-100">
      <div className="flex h-12 items-center justify-between border-b border-white/10 px-5">
        <div>
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
            Society Thinking Stream
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Live peer suggestions, critiques, handoffs, and consensus.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-200">
          <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
          Live
        </span>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 text-xs leading-relaxed"
      >
        {entries.map((entry, index) => {
          const parsed = parseEntry(entry);
          const styles = kindStyles(parsed.kind);
          const Icon = styles.Icon;
          const isActive = index === entries.length - 1 && parsed.kind === "thinking";

          return (
            <div
              key={`${index}-${entry}`}
              className={`group relative overflow-hidden rounded-lg border px-3 py-2 shadow-sm transition ${styles.tone} ${isActive ? "ring-1 ring-current/25" : ""}`}
            >
              {isActive ? (
                <div className="absolute inset-x-0 top-0 h-px animate-pulse bg-current/50" />
              ) : null}
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-md bg-current/10 ${isActive ? "animate-pulse" : ""}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span
                  className="max-w-[45%] truncate font-mono text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80"
                  title={parsed.role}
                >
                  {parsed.role}
                </span>
                <span
                  className="ml-auto rounded-full border border-current/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] opacity-80"
                >
                  {styles.label}
                </span>
              </div>
              <p className="font-medium text-current/95">
                {parsed.message}
                {isActive ? (
                  <span className="ml-1 inline-flex w-5 justify-between align-baseline">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-current" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
                  </span>
                ) : null}
              </p>
            </div>
          );
        })}
        {activeCount > 0 ? (
          <div className="px-1 pt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
            {activeCount} live reasoning update{activeCount === 1 ? "" : "s"} streamed this run
          </div>
        ) : null}
      </div>
    </section>
  );
}
