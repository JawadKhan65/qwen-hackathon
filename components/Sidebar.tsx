"use client";

import {
  Clapperboard,
  FileText,
  Image,
  Palette,
  PenTool,
  Search,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";

type SidebarProps = {
  addNode: (nodeType: string) => void;
};

type Agent = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

const agentCategories: Array<{ title: string; agents: Agent[] }> = [
  {
    title: "Inputs",
    agents: [
      {
        id: "productImage",
        label: "Product Image",
        description: "Reference asset",
        icon: Image,
        accent: "bg-stone-500",
      },
      {
        id: "rawNotes",
        label: "Product Brief",
        description: "Minimal context",
        icon: FileText,
        accent: "bg-slate-500",
      },
    ],
  },
  {
    title: "Showrunners",
    agents: [
      {
        id: "artDirector",
        label: "Art Director",
        description: "Visual concepting",
        icon: Palette,
        accent: "bg-purple-400",
      },
      {
        id: "videoDirector",
        label: "Video Director",
        description: "Motion planning",
        icon: Video,
        accent: "bg-zinc-500",
      },
    ],
  },
  {
    title: "GTM Society",
    agents: [
      {
        id: "copywriter",
        label: "Ad Copywriter",
        description: "Paid social copy",
        icon: PenTool,
        accent: "bg-amber-600",
      },
      {
        id: "seoStrategist",
        label: "SEO Strategist",
        description: "Search angles",
        icon: Search,
        accent: "bg-teal-600",
      },
      {
        id: "scriptwriter",
        label: "Scriptwriter",
        description: "30s narrative",
        icon: Clapperboard,
        accent: "bg-rose-500",
      },
    ],
  },
];

export default function Sidebar({ addNode }: SidebarProps) {
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l border-slate-300/70 bg-white/35 text-slate-950 shadow-2xl shadow-slate-900/10 backdrop-blur-xl">
      <div className="border-b border-slate-300/70 px-5 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-orange-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold tracking-tight">Agent Society</h2>
        </div>
        <p className="mt-1 text-xs text-slate-600">
          Add roles; the society handles the prompts.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {agentCategories.map((category) => (
          <section key={category.title}>
            <h3 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {category.title}
            </h3>
            <div className="space-y-2">
              {category.agents.map((agent) => {
                const Icon = agent.icon;

                return (
                  <button
                    key={`${category.title}-${agent.label}`}
                    type="button"
                    onClick={() => addNode(agent.id)}
                    className="group relative flex w-full items-center gap-3 overflow-hidden rounded-md border border-white/70 bg-white/45 px-3 py-3 text-left shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:bg-white/75 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <span
                      className={`absolute bottom-0 left-0 top-0 w-1 ${agent.accent}`}
                      aria-hidden="true"
                    />
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-950/85 text-slate-200 transition group-hover:bg-slate-700 group-hover:text-white">
                      <Icon className="h-4 w-4" aria-hidden={true} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-950">
                        {agent.label}
                      </span>
                      <span className="block truncate text-xs text-slate-600">
                        {agent.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
