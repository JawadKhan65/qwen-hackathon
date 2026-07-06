import { generateStreamingMultimodalText, generateStreamingText, generateText } from "@/lib/qwen-client";
import type { PipelineEdge, PipelineNode } from "@/lib/types";

type SocietyInput = {
  edges: PipelineEdge[];
  onLog?: (message: string) => void;
  nodes: PipelineNode[];
};

export type SocietyPlan = {
  brief: string;
  critique: string;
};

function valueAsString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function productImage(nodes: PipelineNode[]): string | undefined {
  const node = nodes.find((item) => item.type === "productImage");
  const image = node?.data?.imageUrl ?? node?.data?.url;
  return typeof image === "string" && image.trim() ? image : undefined;
}

function rawBrief(nodes: PipelineNode[]): string {
  const node = nodes.find((item) => item.type === "rawNotes");
  return valueAsString(node?.data?.notes ?? node?.data?.text);
}

function graphSummary(nodes: PipelineNode[], edges: PipelineEdge[]): string {
  return [
    `Nodes: ${nodes.map((node) => `${node.id}:${node.type ?? "unknown"}`).join(", ")}`,
    `Edges: ${edges.map((edge) => `${edge.source}->${edge.target}`).join(", ") || "none"}`,
  ].join("\n");
}

export async function runSocietyRoundtable({
  edges,
  onLog,
  nodes,
}: SocietyInput): Promise<SocietyPlan> {
  const imageUrl = productImage(nodes);
  const notes = rawBrief(nodes) || "No written notes supplied. Infer cautiously from the product image.";
  const graph = graphSummary(nodes, edges);
  const sharedContext = [
    "User supplied a visual node graph. The topology is the workflow instruction.",
    graph,
    `Raw user notes:\n${notes}`,
  ].join("\n\n");

  onLog?.("> [Roundtable] Three lenses on the same product simultaneously — visual truth, market reality, and creative direction. The brief only lands if all three agree.");
  const [visualAudit, marketAudit, creativeAudit] = await Promise.all([
    generateStreamingMultimodalText(
      "You are the Visual Analyst in an agent society. Inspect the product image and determine product category, visible attributes, likely use context, risks, and whether it matches the notes. Be strict but constructive.",
      sharedContext,
      imageUrl,
      (chunk) => onLog?.(`> [Visual Analyst] ${chunk}`),
    ),
    generateStreamingText(
      "You are the GTM Strategist in an agent society. Convert vague product notes into a selling strategy: target buyer, positioning, key benefit, objections, offer angle, and proof points. Flag missing information.",
      sharedContext,
      (chunk) => onLog?.(`> [GTM Strategist] ${chunk}`),
    ),
    generateStreamingText(
      "You are the Creative Director in an agent society. Recommend: (1) the single best lifestyle image style with lighting, props, mood; (2) the best video motion style for that image; (3) copy tone and channel fit. Be specific and decisive - no options, just the winning direction.",
      sharedContext,
      (chunk) => onLog?.(`> [Creative Director] ${chunk}`),
    ),
  ]);

  onLog?.("> [Visual Analyst] Cross-referenced the image against the notes — there's a signal worth building on, and one assumption I had to make explicit.");
  onLog?.("> [GTM Strategist] Positioning angle resolved. I know who this is for and which objection to kill in the first two seconds.");
  onLog?.("> [Creative Director] One direction decided — not options. The image style, the motion style, and the copy tone all point the same way now.");

  onLog?.("> [Chair] Three strong perspectives on the table. I need to find the through-line — one brief that every specialist can execute without ambiguity.");
  const brief = await generateText(
    "You are the Chair of an ecommerce agent society. Produce the final consensus GTM brief. Return markdown with: ### Consensus Strategy, ### Image Style Decision, ### Video Style Decision, ### Copy Strategy, ### SEO Strategy, ### Audience & Positioning, ### Open Risks. Choose one direction for each - no alternatives. If notes and image conflict, state your assumption.",
    [
      "Roundtable inputs:",
      "## Visual Analyst",
      visualAudit,
      "## GTM Strategist",
      marketAudit,
      "## Creative Director",
      creativeAudit,
    ].join("\n\n"),
  );
  onLog?.("> [Chair] Brief finalized. One positioning, one image direction, one motion style. No alternatives — downstream agents need certainty, not a menu.");

  return {
    brief,
    critique: [
      "### Visual Analyst",
      visualAudit,
      "### GTM Strategist",
      marketAudit,
      "### Creative Director",
      creativeAudit,
    ].join("\n\n"),
  };
}
