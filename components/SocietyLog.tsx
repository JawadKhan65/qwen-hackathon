"use client";

import { Brain, CheckCircle2, GitMerge, MessageSquareQuote, Radio, Sparkles, Terminal, TriangleAlert, ChevronUp, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const defaultLogEntries = ["> [System] Pipeline initialized."];

type SocietyLogProps = {
  entries?: string[];
  height?: number;
  onHeightChange?: (height: number) => void;
  isOpen?: boolean;
  onToggleOpen?: () => void;
};

type EntryKind = "thinking" | "suggestion" | "consensus" | "complete" | "error" | "system" | "streaming";

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
  if (lower.includes("thinking") || lower.includes("inspecting") || lower.includes("analyzing")) return "thinking";

  return "system";
}

function parseEntry(entry: string): { role: string; message: string; kind: EntryKind } {
  // Matches e.g. "> [System] Message"
  const match = entry.match(/^>\s+\[([^\]]+)]\s*(.*)$/);
  const role = match?.[1] ?? "Society";
  const message = match?.[2] ?? entry;

  return { role, message, kind: entryKind(message) };
}

export default function SocietyLog({ 
  entries = defaultLogEntries,
  height = 220,
  onHeightChange,
  isOpen = true,
  onToggleOpen
}: SocietyLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [entries]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !onHeightChange) return;
    // Calculate new height from bottom of window
    const newHeight = window.innerHeight - e.clientY;
    if (newHeight >= 60 && newHeight <= 600) {
      onHeightChange(newHeight);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  const getCLIColor = (role: string) => {
    const r = role.toLowerCase();
    if (r === "system") return "text-slate-400";
    if (r === "visual analyst") return "text-cyan-400";
    if (r === "gtm strategist") return "text-amber-400";
    if (r === "creative director") return "text-pink-400";
    if (r === "art director") return "text-indigo-400";
    if (r === "video director") return "text-rose-400";
    if (r === "growth strategist") return "text-emerald-400";
    if (r === "chair") return "text-purple-400";
    return "text-sky-300";
  };

  return (
    <section 
      style={{ height: isOpen ? `${height}px` : "36px" }}
      className="flex shrink-0 flex-col border-t border-slate-200 bg-slate-900 text-slate-100 font-mono transition-[height] duration-150 ease-out select-none relative"
    >
      {/* Resizing Handle - top border draggable divider */}
      {isOpen && (
        <div 
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize bg-slate-700/30 hover:bg-slate-500/50 transition-colors z-20"
          title="Drag to resize panel"
        />
      )}

      {/* Header bar */}
      <div 
        onClick={onToggleOpen}
        className="flex h-9 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 cursor-pointer select-none text-[10px] uppercase tracking-wider text-slate-400"
      >
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5 text-slate-500" />
          <span>Autonomous Society Thinking stream</span>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span>Live stream</span>
            </span>
          ) : (
            <span>Paused</span>
          )}
          <button 
            type="button" 
            className="p-1 hover:bg-slate-800 rounded transition"
            aria-label={isOpen ? "Collapse panel" : "Expand panel"}
          >
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* CLI output console log */}
      {isOpen && (
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto px-5 py-3 text-[11px] leading-relaxed font-mono bg-slate-950 text-slate-300 select-text"
        >
          {entries.map((entry, index) => {
            const parsed = parseEntry(entry);
            const roleColor = getCLIColor(parsed.role);
            const isError = parsed.kind === "error";

            return (
              <div 
                key={`${index}-${entry}`} 
                className={`py-0.5 border-b border-slate-900/40 hover:bg-slate-900/30 font-mono flex items-start gap-1 ${isError ? "text-red-400 bg-red-950/10" : ""}`}
              >
                <span className="text-slate-600 select-none">[{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                <span className={`${roleColor} font-bold`}>{parsed.role}</span>
                <span className="text-slate-500 select-none">→</span>
                <span className="flex-1 whitespace-pre-wrap">{parsed.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
