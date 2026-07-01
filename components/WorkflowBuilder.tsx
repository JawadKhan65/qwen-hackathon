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
import { Play, Rocket } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import Sidebar from "@/components/Sidebar";
import SocietyLog from "@/components/SocietyLog";
import SocietySummary from "@/components/SocietySummary";
import ArtDirectorNode from "@/components/nodes/ArtDirectorNode";
import CopywriterNode from "@/components/nodes/CopywriterNode";
import ProductImageNode from "@/components/nodes/ProductImageNode";
import RawNotesNode from "@/components/nodes/RawNotesNode";
import ScriptwriterNode from "@/components/nodes/ScriptwriterNode";
import SeoStrategistNode from "@/components/nodes/SeoStrategistNode";
import VideoDirectorNode from "@/components/nodes/VideoDirectorNode";
import { type AgentNodeType } from "@/lib/agent-prompts";

export type AgentNodeData = {
  title?: string;
  status?: "idle" | "running" | "done" | "error";
  result?: unknown;
  error?: string;
  prompt?: string;
  imageUrl?: string;
  notes?: string;
  text?: string;
  onDelete?: (nodeId: string) => void;
  onChange?: (nextData: Partial<AgentNodeData>) => void;
};

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

function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<AgentNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<PipelineSummary | null>(null);
  const [logEntries, setLogEntries] = useState<string[]>([
    "> [System] Pipeline initialized.",
  ]);

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
            status?: AgentNodeData["status"] | "complete";
            result?: unknown;
            data?: unknown;
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

          if (
            !payload.nodeId ||
            !payload.status ||
            payload.status === "complete"
          ) {
            continue;
          }

          const nodeStatus: AgentNodeData["status"] = payload.status;

          setNodes((currentNodes) =>
            currentNodes.map((node) =>
              node.id === payload.nodeId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      status: nodeStatus,
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

  return (
    <main className="h-screen w-screen overflow-hidden bg-white text-slate-950">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-emerald-300 shadow-sm">
            <Rocket className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-slate-950">
              LaunchGrid
            </h1>
            <p className="text-xs text-slate-500">Autonomous launch society</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runPipeline}
            disabled={isRunning}
            className="inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold text-orange-700  transition hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Play className="h-4 w-4  fill-white" aria-hidden="true" />
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
          <SocietyLog entries={logEntries} />
        </section>

        <Sidebar addNode={addNode} />
      </div>
    </main>
  );
}

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas />
    </ReactFlowProvider>
  );
}


