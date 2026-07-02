export type PipelineNode = {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
};

export type PipelineEdge = {
  id?: string;
  source: string;
  target: string;
};

export type PipelineResultMap = Record<string, unknown>;

export type AgentNodeData = {
  title?: string;
  status?: "idle" | "running" | "done" | "error";
  result?: unknown;
  streamingText?: string;
  error?: string;
  prompt?: string;
  imageUrl?: string;
  notes?: string;
  text?: string;
  onDelete?: (nodeId: string) => void;
  onChange?: (nextData: Partial<AgentNodeData>) => void;
};
