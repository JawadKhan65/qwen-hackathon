"use client";

import React from "react";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number; // in seconds
  className?: string;
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 4,
  className = "",
}: ShinyTextProps) {
  if (disabled) {
    return <span className={className}>{text}</span>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shiny-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />
      <span
        style={{
          animation: `shiny-shimmer ${speed}s linear infinite`,
          backgroundSize: "200% 100%",
        }}
        className={`inline-block bg-gradient-to-r from-slate-900 via-slate-400 to-slate-900 dark:from-slate-100 dark:via-emerald-200 dark:to-slate-100 bg-clip-text text-transparent ${className}`}
      >
        {text}
      </span>
    </>
  );
}
