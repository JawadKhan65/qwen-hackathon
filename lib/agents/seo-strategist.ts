import { generateText } from "@/lib/qwen-client";

const SYSTEM_PROMPT =
  "You are the SEO Strategist in an ecommerce launch agent society. Use the upstream product and creative context. Return polished markdown with: ### Product Title, ### Meta Description, ### Keyword Cluster, and ### Product Description. Avoid generic filler.";

export async function runSeoStrategist(context: string): Promise<string> {
  return generateText(SYSTEM_PROMPT, context);
}
