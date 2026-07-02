"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Plus, Trash2, Edit3, Check, X, FileText, 
  LogOut, Info, Layers, ChevronDown, ChevronUp, PanelLeftClose
} from "lucide-react";
import Link from "next/link";

interface WorkflowItem {
  _id: string;
  name: string;
  updatedAt: string;
}

interface WorkspaceSidebarProps {
  currentWorkflowId?: string;
  currentWorkflowName?: string;
  session: any;
  onWorkflowSelected?: (id: string) => void;
  onNewWorkflowCreated?: (id: string) => void;
  onWorkflowRenamed?: (id: string, newName: string) => void;
  onToggleCollapse?: () => void;
  className?: string;
}

export default function WorkspaceSidebar({
  currentWorkflowId,
  currentWorkflowName,
  session,
  onWorkflowSelected,
  onNewWorkflowCreated,
  onWorkflowRenamed,
  onToggleCollapse,
  className = "",
}: WorkspaceSidebarProps) {
  const router = useRouter();
  
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  // Fetch workflows from API
  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data.workflows || []);
      }
    } catch (err) {
      console.error("Failed to load workflows", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchWorkflows();
    } else {
      setLoading(false);
    }
  }, [session, currentWorkflowId]);

  // Sync parent workflowName changes immediately down to the local workflows list
  useEffect(() => {
    if (currentWorkflowId && currentWorkflowName) {
      setWorkflows(prev =>
        prev.map(w => (w._id === currentWorkflowId ? { ...w, name: currentWorkflowName } : w))
      );
    }
  }, [currentWorkflowId, currentWorkflowName]);

  // Create new workflow
  const createNewWorkflow = async () => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Canvas #${workflows.length + 1}` }),
      });
      if (res.ok) {
        const data = await res.json();
        const newId = data.workflow._id;
        fetchWorkflows();
        if (onNewWorkflowCreated) {
          onNewWorkflowCreated(newId);
        } else {
          router.push(`/v1/${newId}`);
        }
      }
    } catch (err) {
      console.error("Error creating workflow", err);
    }
  };

  // Delete workflow
  const deleteWorkflow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this canvas workflow?")) return;
    
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWorkflows(prev => prev.filter(w => w._id !== id));
        if (currentWorkflowId === id) {
          router.push("/");
        }
      }
    } catch (err) {
      console.error("Error deleting workflow", err);
    }
  };

  // Start renaming
  const startRename = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(id);
    setEditName(name);
  };

  // Save renamed workflow
  const saveRename = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (res.ok) {
        setWorkflows(prev =>
          prev.map(w => (w._id === id ? { ...w, name: editName } : w))
        );
        if (onWorkflowRenamed && id === currentWorkflowId) {
          onWorkflowRenamed(id, editName);
        }
        setEditingId(null);
      }
    } catch (err) {
      console.error("Error renaming workflow", err);
    }
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(null);
  };

  return (
    <aside className={`flex h-full w-72 flex-col border-r border-slate-200 bg-slate-50 text-slate-800 transition-all duration-200 ${className}`}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200/80 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Layers className="h-4.5 w-4.5 text-slate-500" />
          <span className="font-sans text-sm font-semibold tracking-tight text-slate-900">
            LaunchGrid <span className="text-[10px] text-slate-400 font-mono font-normal">v1</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={createNewWorkflow}
            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-800"
            title="Create New Canvas"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggleCollapse}
            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-200/60 hover:text-slate-800"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Product Canvas Overview Accordion - simplified/minimal */}
      <div className="border-b border-slate-200 px-2 py-1.5 bg-slate-100/50">
        <button
          onClick={() => setIsOverviewOpen(!isOverviewOpen)}
          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs font-semibold text-slate-600 hover:bg-slate-200/50"
        >
          <span className="flex items-center gap-1.5 text-[10px] tracking-wide uppercase text-slate-500">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            Overview
          </span>
          {isOverviewOpen ? <ChevronUp className="h-3 w-3 text-slate-400" /> : <ChevronDown className="h-3 w-3 text-slate-400" />}
        </button>

        {isOverviewOpen && (
          <div className="mt-1 rounded-md bg-white p-2.5 text-[11px] leading-relaxed text-slate-500 border border-slate-200 max-h-40 overflow-y-auto">
            <p className="mb-1.5">
              Drag & drop agents. Connect wires to dictate pipeline topology. No prompt engineering required.
            </p>
            <span className="font-semibold text-slate-700">Available Agents:</span>
            <ul className="list-disc pl-3.5 mt-0.5 space-y-0.5 text-slate-500">
              <li>Art Director (Lifestyle images)</li>
              <li>Video Director (10s HTML5 motion ads)</li>
              <li>SEO Strategist (Search copywriting)</li>
              <li>Ad Copywriter (Paid social hooks)</li>
              <li>Scriptwriter (Word-for-word VO scripts)</li>
            </ul>
          </div>
        )}
      </div>

      {/* Workflows List */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <h3 className="mb-1.5 px-2 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Saved Canvases
        </h3>
        
        {loading ? (
          <div className="py-3 text-center text-xs text-slate-400">Loading...</div>
        ) : workflows.length === 0 ? (
          <div className="px-2 py-3 text-xs text-slate-400 italic">
            No canvases. Click the plus icon to create one.
          </div>
        ) : (
          <div className="space-y-0.5">
            {workflows.map((w) => {
              const isActive = w._id === currentWorkflowId;
              const isEditing = w._id === editingId;

              return (
                <div
                  key={w._id}
                  onClick={() => !isEditing && onWorkflowSelected && onWorkflowSelected(w._id)}
                  className={`group relative flex items-center justify-between rounded-md px-2 py-1.5 text-xs transition cursor-pointer ${
                    isActive 
                      ? "bg-slate-200/80 text-slate-900 font-semibold" 
                      : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900"
                  }`}
                >
                  <div className="flex flex-1 items-center gap-1.5 min-w-0">
                    <FileText className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-slate-700" : "text-slate-400"}`} />
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded bg-white border border-slate-300 px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate pr-12 font-medium">{w.name}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isEditing ? (
                      <>
                        <button
                          onClick={(e) => saveRename(w._id, e)}
                          className="rounded p-0.5 text-slate-500 hover:text-slate-900 hover:bg-slate-300/50"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelRename}
                          className="rounded p-0.5 text-slate-500 hover:text-red-600 hover:bg-slate-300/50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => startRename(w._id, w.name, e)}
                          className="rounded p-0.5 text-slate-400 hover:text-slate-900 hover:bg-slate-300/30"
                          title="Rename"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={(e) => deleteWorkflow(w._id, e)}
                          className="rounded p-0.5 text-slate-400 hover:text-red-600 hover:bg-slate-300/30"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Section / Footer */}
      <div className="mt-auto border-t border-slate-200 bg-slate-100 px-3 py-2.5">
        {session ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="h-7 w-7 rounded-full border border-slate-200"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-700">
                  {session.user?.name ? session.user.name[0].toUpperCase() : "U"}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-700">{session.user?.name || "Developer"}</p>
                <p className="truncate text-[9px] text-slate-400">{session.user?.email}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const { signOut } = await import("next-auth/react");
                signOut({ callbackUrl: "/" });
              }}
              className="rounded-md p-1 text-slate-400 transition hover:bg-slate-200 hover:text-red-600"
              title="Log Out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
