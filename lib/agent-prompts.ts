export type AgentNodeType =
  | "productImage"
  | "rawNotes"
  | "artDirector"
  | "videoDirector"
  | "copywriter"
  | "seoStrategist"
  | "scriptwriter";

export const defaultAgentPrompts: Record<AgentNodeType, string> = {
  productImage:
    "Upload or describe the hero product image. Keep it clean, premium, and launch-ready.",
  rawNotes:
    "Capture the launch brief, audience, timing, positioning, and non-negotiable constraints.",
  artDirector:
    "Create a premium lifestyle image from the product input. Prioritize lighting, composition, and aspirational context.",
  videoDirector:
    "Turn the lifestyle image into a short-form product video with strong motion rhythm and a polished finish.",
  copywriter:
    "Write short, punchy ad copy that feels native to paid social and matches the brand tone.",
  seoStrategist:
    "Produce SEO-friendly product launch copy with title, meta description, and keyword cluster.",
  scriptwriter:
    "Write a word-for-word voiceover script for the creator to record. Adapts energy and pace to the Video Director's motion style — fast-cut gets staccato punchy lines, cinematic gets smooth narration.",
};

export function getDefaultPrompt(nodeType: AgentNodeType): string {
  return defaultAgentPrompts[nodeType];
}