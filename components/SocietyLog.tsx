"use client";

import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export const defaultLogEntries = ["> [System] Pipeline initialized."];

type SocietyLogProps = {
  entries?: string[];
  height?: number;
  onHeightChange?: (height: number) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
};

// ─── Markdown stripper ────────────────────────────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*{1,3}|_{1,3})(.+?)\1/g, "$2")
    .replace(/^[-*_]{3,}\s*$/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^(\s*[-*+]|\s*\d+\.)\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Entry parsing ────────────────────────────────────────────────────────────
type ParsedEntry = { role: string; message: string; isSystem: boolean };

function parseEntry(entry: string): ParsedEntry {
  const match = entry.match(/^>\s+\[([^\]]+)]\s*([\s\S]*)$/);
  const role = match?.[1] ?? "Society";
  const rawMessage = match?.[2] ?? entry;
  const message = stripMarkdown(rawMessage);
  const isSystem = role.toLowerCase() === "system";
  return { role, message, isSystem };
}

// ─── Coalescing ───────────────────────────────────────────────────────────────
type CoalescedEntry = ParsedEntry & { key: string; index: number };

function coalesceEntries(entries: string[]): CoalescedEntry[] {
  const result: CoalescedEntry[] = [];
  for (let i = 0; i < entries.length; i++) {
    const parsed = parseEntry(entries[i]);
    const prev = result[result.length - 1];
    if (
      prev &&
      prev.role === parsed.role &&
      !parsed.isSystem &&
      !prev.isSystem &&
      parsed.message.length > 0
    ) {
      const sep =
        prev.message.endsWith(" ") || parsed.message.startsWith(" ") ? "" : " ";
      prev.message = (prev.message + sep + parsed.message)
        .replace(/\s{2,}/g, " ")
        .trim();
    } else {
      result.push({ ...parsed, key: `${i}-${parsed.role}`, index: result.length });
    }
  }
  return result;
}

// ─── Role styling ─────────────────────────────────────────────────────────────
type RoleStyle = { dot: string; badge: string; text: string; streamText: string };

function getRoleStyle(role: string): RoleStyle {
  const r = role.toLowerCase();
  if (r === "system")
    return {
      dot: "bg-slate-600",
      badge: "bg-slate-800/60 text-slate-500 border-slate-700/50",
      text: "text-slate-500",
      streamText: "text-slate-400",
    };
  if (r === "visual analyst")
    return {
      dot: "bg-cyan-400",
      badge: "bg-cyan-950/60 text-cyan-300 border-cyan-800/40",
      text: "text-slate-300",
      streamText: "text-cyan-200",
    };
  if (r === "gtm strategist")
    return {
      dot: "bg-amber-400",
      badge: "bg-amber-950/60 text-amber-300 border-amber-800/40",
      text: "text-slate-300",
      streamText: "text-amber-200",
    };
  if (r === "creative director")
    return {
      dot: "bg-pink-400",
      badge: "bg-pink-950/60 text-pink-300 border-pink-800/40",
      text: "text-slate-300",
      streamText: "text-pink-200",
    };
  if (r === "art director")
    return {
      dot: "bg-indigo-400",
      badge: "bg-indigo-950/60 text-indigo-300 border-indigo-800/40",
      text: "text-slate-300",
      streamText: "text-indigo-200",
    };
  if (r === "video director")
    return {
      dot: "bg-rose-400",
      badge: "bg-rose-950/60 text-rose-300 border-rose-800/40",
      text: "text-slate-300",
      streamText: "text-rose-200",
    };
  if (r === "chair")
    return {
      dot: "bg-purple-400",
      badge: "bg-purple-950/60 text-purple-300 border-purple-800/40",
      text: "text-slate-200",
      streamText: "text-purple-100",
    };
  if (r.includes("society") || r.includes("roundtable"))
    return {
      dot: "bg-emerald-400",
      badge: "bg-emerald-950/60 text-emerald-300 border-emerald-800/40",
      text: "text-slate-300",
      streamText: "text-emerald-200",
    };
  if (role.includes("->") || role.includes("→"))
    return {
      dot: "bg-sky-400",
      badge: "bg-sky-950/60 text-sky-400 border-sky-800/40",
      text: "text-slate-400 italic",
      streamText: "text-sky-300 italic",
    };
  return {
    dot: "bg-sky-400",
    badge: "bg-sky-950/60 text-sky-300 border-sky-800/40",
    text: "text-slate-300",
    streamText: "text-sky-200",
  };
}

// ─── Streaming text component ─────────────────────────────────────────────────
// The last (actively streaming) entry shows a shiny shimmer sweep.
// A blinking cursor sits at the end while it is the active entry.
function StreamingText({
  text,
  isActive,
  baseClass,
}: {
  text: string;
  isActive: boolean;
  baseClass: string;
}) {
  if (!isActive) {
    return <span className={`text-[11px] leading-relaxed font-sans flex-1 ${baseClass}`}>{text}</span>;
  }

  return (
    <span className="flex-1 flex items-baseline gap-0 flex-wrap">
      <span
        className="log-text-streaming text-[11px] leading-relaxed font-sans"
      >
        {text}
      </span>
      {/* Blinking cursor */}
      <span
        className="inline-block w-[2px] h-[13px] ml-0.5 rounded-sm bg-slate-400 align-middle"
        style={{ animation: "blink 1s step-end infinite" }}
      />
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SocietyLog({
  entries = defaultLogEntries,
  height = 240,
  onHeightChange,
  isOpen = true,
  onToggleOpen,
}: SocietyLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  // Track which coalesced entries have already been seen, so we only animate new ones
  const [seenCount, setSeenCount] = useState(0);

  const coalesced = useMemo(() => coalesceEntries(entries), [entries]);

  // Auto-scroll on new entries
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [coalesced]);

  // Bump seenCount when the panel settles (entries stop changing for 1.2s)
  // This is used to stop the shimmer on entries that are "done"
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      setSeenCount(coalesced.length);
    }, 1200);
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [coalesced]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !onHeightChange) return;
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight >= 60 && newHeight <= 600) onHeightChange(newHeight);
  };
  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const lastIndex = coalesced.length - 1;

  return (
    <section
      style={{ height: isOpen ? `${height}px` : "36px" }}
      className="flex shrink-0 flex-col border-t border-slate-800/60 bg-slate-950 text-slate-100 transition-[height] duration-150 ease-out select-none relative"
    >
      {isOpen && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize bg-slate-800/50 hover:bg-slate-600/60 transition-colors z-20"
          title="Drag to resize"
        />
      )}

      {/* Header */}
      <div
        onClick={onToggleOpen}
        className="flex h-9 shrink-0 items-center justify-between border-b border-slate-800/60 bg-slate-950 px-4 cursor-pointer text-[10px] uppercase tracking-widest text-slate-500"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-3 w-3 text-slate-600" />
          <span className="font-medium">Agent Thinking Stream</span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <span className="flex items-center gap-1.5 text-emerald-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span>Live</span>
            </span>
          ) : (
            <span className="text-slate-600">Paused</span>
          )}
          <button
            type="button"
            className="p-1 hover:bg-slate-800 rounded transition"
            aria-label={isOpen ? "Collapse panel" : "Expand panel"}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Log body */}
      {isOpen && (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto select-text"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}
        >
          <div className="flex flex-col gap-px py-2">
            {coalesced.map((entry, i) => {
              const style = getRoleStyle(entry.role);
              // The entry is "active" (streaming) if it is the last one and hasn't settled yet
              const isActive = i === lastIndex && coalesced.length > seenCount;
              // Entries added after the initial render get the slide-in animation
              const isNew = i >= seenCount - 1;

              if (entry.isSystem) {
                return (
                  <div
                    key={entry.key}
                    className={`flex items-center gap-2 px-4 py-1 ${isNew ? "log-entry-animate" : ""}`}
                  >
                    <div className="h-px flex-1 bg-slate-800/80" />
                    <span className="text-[10px] text-slate-600 font-mono tracking-wide whitespace-nowrap">
                      {entry.message}
                    </span>
                    <div className="h-px flex-1 bg-slate-800/80" />
                  </div>
                );
              }

              return (
                <div
                  key={entry.key}
                  className={`flex items-start gap-2.5 px-4 py-1.5 hover:bg-slate-900/40 transition-colors ${isNew ? "log-entry-animate" : ""}`}
                >
                  {/* Color dot */}
                  <div className="mt-[6px] shrink-0">
                    <span
                      className={`block h-1.5 w-1.5 rounded-full ${style.dot} ${isActive ? "animate-pulse" : ""}`}
                    />
                  </div>

                  {/* Role badge */}
                  <span
                    className={`mt-px shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest border ${style.badge}`}
                    style={{ lineHeight: "1.4" }}
                  >
                    {entry.role}
                  </span>

                  {/* Message — shiny while streaming, plain once settled */}
                  <StreamingText
                    text={entry.message}
                    isActive={isActive}
                    baseClass={style.text}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
