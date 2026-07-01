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
      "You are the Creative Director in an agent society. Recommend visual themes, lifestyle setting, motion style, copy tone, and channel fit. Resolve tension between aspirational creative and product truth.",
      sharedContext,
    ),
  ]);
  onLog?.("> [Visual Analyst] Product/category signals extracted from the uploaded asset.");
  onLog?.("> [GTM Strategist] Buyer, positioning, objections, and offer levers drafted.");
  onLog?.("> [Creative Director] Initial lifestyle and motion territories proposed.");

  onLog?.("> [Roundtable] Suggestion round started: each specialist is putting a concrete option on the table.");
  const styleOptions = await generateText(
    "You are the Art Director. Propose 3 distinct lifestyle image territories for this ecommerce launch. For each: setting, lighting, props, mood, why it sells, and what the Video Director should preserve if animated. End with one recommended image style.",
    [sharedContext, visualAudit, marketAudit, creativeAudit].join("\n\n"),
  );
  onLog?.("> [Art Director] Suggested 3 image territories and nominated the strongest one.");

  onLog?.("> [Roundtable] Cross-critique started: agents are challenging each other's proposed direction.");
  const [motionCritique, salesCritique] = await Promise.all([
    generateText(
      "You are the Video Director. Review the Art Director's image territories. Suggest the video style that best matches each territory, then pick the image/video pair that can animate best in 3-5 seconds. Explain tradeoffs and any style changes you request from the Art Director.",
      [sharedContext, visualAudit, marketAudit, creativeAudit, "## Art Director Style Options", styleOptions].join("\n\n"),
    ),
    generateText(
      "You are the Growth Strategist. Critique the Art Director's image territories for conversion, clarity, buyer desire, and channel fit. Vote for the strongest GTM direction and say what copy angle should support it.",
      [sharedContext, visualAudit, marketAudit, creativeAudit, "## Art Director Style Options", styleOptions].join("\n\n"),
    ),
  ]);
  onLog?.("> [Video Director] Suggested the best video style for each image territory, then picked the strongest pair.");
  onLog?.("> [Growth Strategist] Voted on the creative options against conversion and channel fit.");

  const artResponse = await generateText(
    "You are the Art Director responding to peers. Revise your recommendation after considering video feasibility and conversion risk. Name the final image style you would defend in the consensus meeting.",
    [
      sharedContext,
      visualAudit,
      marketAudit,
      creativeAudit,
      "## Original Art Director Options",
      styleOptions,
      "## Video Director Critique",
      motionCritique,
      "## Growth Strategist Critique",
      salesCritique,
    ].join("\n\n"),
  );
  onLog?.("> [Art Director] Revised the image recommendation after peer critique.");

  const brief = await generateText(
    "You are the Chair of an ecommerce agent society. Resolve disagreements and choose one consensus GTM direction. You must explicitly choose the best image style, the best video style, and explain why the winning pair beat the alternatives. Return markdown with: ### Asset Match, ### Peer Suggestions, ### Disagreement Resolved, ### Consensus Strategy, ### Calibrated Product Brief, ### Audience & Positioning, ### Image Style Decision, ### Video Style Decision, ### Copy Strategy, ### SEO Strategy, ### Open Risks. If notes and image conflict, resolve or state the assumption.",
    [
      "Roundtable inputs:",
      "## Visual Analyst",
      visualAudit,
      "## GTM Strategist",
      marketAudit,
      "## Creative Director",
      creativeAudit,
      "## Art Director Style Options",
      styleOptions,
      "## Video Director Motion Critique",
      motionCritique,
      "## Growth Strategist Sales Critique",
      salesCritique,
      "## Art Director Response",
      artResponse,
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
      "### Art Director Style Options",
      styleOptions,
      "### Video Director Motion Critique",
      motionCritique,
      "### Growth Strategist Sales Critique",
      salesCritique,
      "### Art Director Response",
      artResponse,
    ].join("\n\n"),
  };
}
