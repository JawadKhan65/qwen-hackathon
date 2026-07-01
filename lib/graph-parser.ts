import type { PipelineEdge, PipelineNode } from "@/lib/types";

export function getExecutionOrder(
  nodes: PipelineNode[],
  edges: PipelineEdge[],
): PipelineNode[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const inDegree = new Map(nodes.map((node) => [node.id, 0]));
  const adjacency = new Map<string, string[]>(
    nodes.map((node) => [node.id, []]),
  );

  for (const edge of edges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
      continue;
    }

    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue = nodes
    .filter((node) => (inDegree.get(node.id) ?? 0) === 0)
    .map((node) => node.id);
  const ordered: PipelineNode[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (!nodeId) {
      continue;
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      continue;
    }

    ordered.push(node);

    for (const targetId of adjacency.get(nodeId) ?? []) {
      const nextDegree = (inDegree.get(targetId) ?? 0) - 1;
      inDegree.set(targetId, nextDegree);
      if (nextDegree === 0) {
        queue.push(targetId);
      }
    }
  }

  if (ordered.length !== nodes.length) {
    throw new Error("Graph contains a cycle or disconnected invalid edge state.");
  }

  return ordered;
}
