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
