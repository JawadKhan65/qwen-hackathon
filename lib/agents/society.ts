import { generateMultimodalText, generateText } from "@/lib/qwen-client";
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

/**
 * Slimmed roundtable: 2 parallel rounds instead of 4 sequential rounds.
 * Round 1: Visual + Market analysis in parallel (was separate calls before)
 * Round 2: Chair synthesises directly — skips the intermediate Art Director / Video Director
 *           critique rounds that added 2-3 minutes with minimal signal gain.
 *
 * Time saved: ~2-3 min (removes 3 sequential LLM calls).
 * Quality preserved: Chair still gets visual truth, GTM angle, and creative territory.
 */
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

  // ── ROUND 1: Three parallel specialist reviews ───────────────────────────
  onLog?.("> [Roundtable] Parallel review started: visual truth, market angle, and creative territory.");
  const [visualAudit, marketAudit, creativeAudit] = await Promise.all([
    generateMultimodalText(
      "You are the Visual Analyst in an agent society. Inspect the product image and determine product category, visible attributes, likely use context, risks, and whether it matches the notes. Be strict but constructive.",
      sharedContext,
      imageUrl,
    ),
    generateText(
      "You are the GTM Strategist in an agent society. Convert vague product notes into a selling strategy: target buyer, positioning, key benefit, objections, offer angle, and proof points. Flag missing information.",
      sharedContext,
    ),
    generateText(
      "You are the Creative Director in an agent society. Recommend: (1) the single best lifestyle image style with lighting, props, mood; (2) the best video motion style for that image; (3) copy tone and channel fit. Be specific and decisive — no options, just the winning direction.",
      sharedContext,
    ),
  ]);
  onLog?.("> [Visual Analyst] Product/category signals extracted from the uploaded asset.");
  onLog?.("> [GTM Strategist] Buyer, positioning, objections, and offer levers drafted.");
  onLog?.("> [Creative Director] Image style, video style, and copy tone decided.");

  // ── ROUND 2: Chair synthesises directly into the consensus brief ─────────
  onLog?.("> [Roundtable] Chair is reconciling style, motion, and selling clarity into one consensus.");
  const brief = await generateText(
    "You are the Chair of an ecommerce agent society. Produce the final consensus GTM brief. Return markdown with: ### Consensus Strategy, ### Image Style Decision, ### Video Style Decision, ### Copy Strategy, ### SEO Strategy, ### Audience & Positioning, ### Open Risks. Choose one direction for each — no alternatives. If notes and image conflict, state your assumption.",
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
  onLog?.("> [Chair] Consensus selected: one image style, one video style, and one selling angle.");

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
