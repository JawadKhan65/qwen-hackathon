"use client";

import "@xyflow/react/dist/style.css";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  addEdge,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Connection,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { Play, Rocket, Edit2, Check, X } from "lucide-react";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import SocietyLog from "@/components/SocietyLog";
import SocietySummary from "@/components/SocietySummary";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import ArtDirectorNode from "@/components/nodes/ArtDirectorNode";
import CopywriterNode from "@/components/nodes/CopywriterNode";
import ProductImageNode from "@/components/nodes/ProductImageNode";
import RawNotesNode from "@/components/nodes/RawNotesNode";
import ScriptwriterNode from "@/components/nodes/ScriptwriterNode";
import SeoStrategistNode from "@/components/nodes/SeoStrategistNode";
import VideoDirectorNode from "@/components/nodes/VideoDirectorNode";
import { type AgentNodeType } from "@/lib/agent-prompts";

import { type AgentNodeData } from "@/lib/types";

type PipelineSummary = {
  rolesAssigned: number;
  wiresResolved: number;
  conflictResolutions: number;
  executedAgents: number;
  durationMs: number;
  baselineMs: number;
  efficiencyGainPercent: number;
};

const nodeTypes = {
  productImage: ProductImageNode,
  rawNotes: RawNotesNode,
  artDirector: ArtDirectorNode,
  videoDirector: VideoDirectorNode,
  copywriter: CopywriterNode,
  seoStrategist: SeoStrategistNode,
  scriptwriter: ScriptwriterNode,
} satisfies NodeTypes;

let nodeCounter = 1;

function createNode(type: AgentNodeType): Node<AgentNodeData> {
  const position = {
    x: Math.random() * 400 + 100,
    y: Math.random() * 400 + 100,
  };

  return {
    id: `${type}-${Date.now()}-${nodeCounter++}`,
    type,
    position,
    data: {},
  };
}

function WorkflowCanvas({ workflowId, session }: { workflowId: string; session: any }) {
  const router = useRouter();
  const status = session ? "authenticated" : "unauthenticated";

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<PipelineSummary | null>(null);
  const [logEntries, setLogEntries] = useState<string[]>([
    "> [System] Pipeline initialized.",
  ]);

  // Collapsible panels & Resizing state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [logHeight, setLogHeight] = useState(200);
  const [isLogOpen, setIsLogOpen] = useState(true);

  // Workflow title state
  const [workflowName, setWorkflowName] = useState("Untitled Canvas");
  const [isRenamingHeader, setIsRenamingHeader] = useState(false);
  const [headerNameInput, setHeaderNameInput] = useState("");

  const initialLoadRef = useRef(false);

  // Auth Protection redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Load workflow from DB
  useEffect(() => {
    if (!workflowId || status !== "authenticated") return;

    initialLoadRef.current = false;
    let isMounted = true;

    const loadWorkflow = async () => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          const workflow = data.workflow;
          if (workflow) {
            setNodes(workflow.nodes || []);
            setEdges(workflow.edges || []);
            setWorkflowName(workflow.name || "Untitled Canvas");
            setHeaderNameInput(workflow.name || "Untitled Canvas");
            initialLoadRef.current = true;
          }
        }
      } catch (err) {
        console.error("Error loading workflow:", err);
      }
    };

    loadWorkflow();

    return () => {
      isMounted = false;
    };
  }, [workflowId, status, setNodes, setEdges]);

  // Debounced Autosave for canvas structure (nodes/edges)
  useEffect(() => {
    if (!workflowId || !initialLoadRef.current || status !== "authenticated") return;

    const timer = setTimeout(async () => {
      try {
        // Remove transient callback handlers from serialized node data before saving
        const serializableNodes = nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: {
            ...node.data,
            onDelete: undefined,
            onChange: undefined,
          },
        }));

        await fetch(`/api/workflows/${workflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: serializableNodes,
            edges,
          }),
        });
      } catch (err) {
        console.error("Error autosaving workflow layout:", err);
      }
    }, 1200); // 1.2-second debounce to reduce DB writes during dragging

    return () => clearTimeout(timer);
  }, [nodes, edges, workflowId, status]);

  const saveHeaderRename = async () => {
    if (!headerNameInput.trim()) return;
    setWorkflowName(headerNameInput);
    setIsRenamingHeader(false);
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: headerNameInput }),
      });
    } catch (err) {
      console.error("Error renaming workflow title:", err);
    }
  };

  const appendLog = useCallback((entry: string) => {
    setLogEntries((current) => [...current.slice(-79), entry]);
  }, []);

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((currentNodes) =>
        currentNodes.filter((node) => node.id !== nodeId),
      );
      setEdges((currentEdges) =>
        currentEdges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        ),
      );
    },
    [setEdges, setNodes],
  );

  const updateNodeData = useCallback(
    (nodeId: string, nextData: Partial<AgentNodeData>) => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...nextData,
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const connectNodes = useCallback(
    (connection: Connection) => {
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: "#475569", strokeWidth: 2 },
          },
          currentEdges,
        ),
      );
    },
    [setEdges],
  );

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onDelete: deleteNode,
          onChange: (nextData: Partial<AgentNodeData>) => updateNodeData(node.id, nextData),
        },
      })),
    [deleteNode, nodes, updateNodeData],
  );

  const addNode = useCallback(
    (nodeType: string) => {
      setNodes((currentNodes) => [
        ...currentNodes,
        createNode(nodeType as AgentNodeType),
      ]);
    },
    [setNodes],
  );

  const runPipeline = useCallback(async () => {
    setIsRunning(true);
    setRunSummary(null);
    setLogEntries([
      "> [System] Pipeline initialized.",
      "> [System] Executing graph from connected nodes.",
    ]);

    if (nodes.length === 0) {
      setLogEntries([
        "> [System] Pipeline initialized.",
        "> [System] No nodes on the canvas. Add input nodes from the palette, then connect the workflow.",
      ]);
      setIsRunning(false);
      return;
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: "idle",
          result: undefined,
          error: undefined,
        },
      })),
    );

    const serializableNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        onDelete: undefined,
        onChange: undefined,
      },
    }));

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: serializableNodes, edges }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Pipeline request failed: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event.split("\n").find((item) => item.startsWith("data: "));
          if (!line) continue;

          const payload = JSON.parse(line.slice(6)) as {
            nodeId?: string;
            status?: AgentNodeData["status"] | "complete" | "streaming";
            result?: unknown;
            data?: unknown;
            chunk?: string;
            error?: string;
            log?: string;
            summary?: PipelineSummary;
          };

          if (payload.log) {
            appendLog(payload.log);
          }

          if (payload.summary) {
            setRunSummary(payload.summary);
          }

          // ChatGPT-style: accumulate streaming tokens inside the node card
          if (payload.status === "streaming" && payload.nodeId && payload.chunk) {
            setNodes((currentNodes) =>
              currentNodes.map((node) =>
                node.id === payload.nodeId
                  ? {
                      ...node,
                      data: {
                        ...node.data,
                        streamingText: (node.data.streamingText ?? "") + payload.chunk,
                      },
                    }
                  : node,
              ),
            );
            continue;
          }

          if (
            !payload.nodeId ||
            !payload.status ||
            payload.status === "complete"
          ) {
            continue;
          }

          const nodeStatus = payload.status as AgentNodeData["status"];

          setNodes((currentNodes) =>
            currentNodes.map((node) =>
              node.id === payload.nodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      status: nodeStatus,
                      // Clear streaming text once the real result arrives
                      streamingText: nodeStatus === "done" ? undefined : node.data.streamingText,
                      result: payload.result ?? payload.data,
                      error: payload.error,
                    },
                  }
                : node,
            ),
          );
        }
      }
    } catch (error) {
      setNodes((currentNodes) =>
        currentNodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            status: node.data.status === "running" ? "error" : node.data.status,
            error: error instanceof Error ? error.message : "Pipeline failed",
          },
        })),
      );
    } finally {
      setIsRunning(false);
    }
  }, [appendLog, edges, nodes, setNodes]);

  if (!session) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-slate-950">
        <div className="text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-950 border-t-transparent mx-auto"></div>
          <p className="mt-2 text-xs text-slate-500 font-medium">Entering Launch Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-950">
      {/* ChatGPT-style light-themed sidebar on the left */}
      {!isSidebarCollapsed && (
        <WorkspaceSidebar 
          currentWorkflowId={workflowId} 
          currentWorkflowName={workflowName}
          onWorkflowRenamed={(id, newName) => {
            setWorkflowName(newName);
            setHeaderNameInput(newName);
          }}
          onToggleCollapse={() => setIsSidebarCollapsed(true)}
          session={session} 
        />
      )}

      {/* Main Studio canvas workspace on the right */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            {isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="mr-1 rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                title="Expand Sidebar"
              >
                <Rocket className="h-4 w-4" />
              </button>
            )}
            {!isSidebarCollapsed && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-emerald-300 shadow-sm">
                <Rocket className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
            <div>
              {isRenamingHeader ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={headerNameInput}
                    onChange={(e) => setHeaderNameInput(e.target.value)}
                    className="rounded bg-slate-100 border border-slate-300 px-2 py-0.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && saveHeaderRename()}
                  />
                  <button onClick={saveHeaderRename} className="p-1 text-emerald-600 hover:text-emerald-500">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setHeaderNameInput(workflowName); setIsRenamingHeader(false); }} className="p-1 text-red-600 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsRenamingHeader(true)}>
                  <h1 className="text-sm font-semibold tracking-tight text-slate-950">
                    {workflowName}
                  </h1>
                  <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
              <p className="text-xs text-slate-500">Autonomous launch society workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runPipeline}
              disabled={isRunning}
              className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play className="h-4 w-4 fill-white" aria-hidden="true" />
              {isRunning ? "Running..." : "Run Pipeline"}
            </button>
          </div>
        </header>

        <div className="flex h-[calc(100vh-4rem)]">
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <ReactFlow
                nodes={displayNodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={connectNodes}
                connectionMode={ConnectionMode.Strict}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                proOptions={{ hideAttribution: true }}
                className="bg-white"
              >
                <Background
                  color="#d6dce3"
                  gap={22}
                  size={4}
                  variant={BackgroundVariant.Dots}
                />
                <MiniMap
                  pannable
                  zoomable
                  className="!bg-white !shadow-lg"
                  maskColor="rgb(15 23 42 / 0.08)"
                  nodeColor="#0f172a"
                />
                <Controls className="!border !border-slate-200 !bg-white !shadow-lg" />
              </ReactFlow>
            </div>
            {runSummary ? <SocietySummary {...runSummary} /> : null}
            
            {/* Draggable and collapsible CLI console log */}
            <SocietyLog 
              entries={logEntries} 
              height={logHeight}
              onHeightChange={setLogHeight}
              isOpen={isLogOpen}
              onToggleOpen={() => setIsLogOpen(!isLogOpen)}
            />
          </section>

          <Sidebar addNode={addNode} />
        </div>
      </main>
    </div>
  );
}

export default function WorkflowBuilder({ workflowId, session }: { workflowId: string; session: any }) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas workflowId={workflowId} session={session} />
    </ReactFlowProvider>
  );
}
