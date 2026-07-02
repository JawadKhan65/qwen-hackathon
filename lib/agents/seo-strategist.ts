import { generateStreamingText } from "@/lib/qwen-client";

const SYSTEM_PROMPT =
  "You are the SEO Strategist in an ecommerce launch agent society. Use the upstream product context. Return polished markdown with: ### Page Title, ### Meta Description, ### Primary Keywords, ### Long-tail Keywords, and ### Content Strategy Notes.";

export async function runSeoStrategist(
  context: string,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  return generateStreamingText(SYSTEM_PROMPT, context, onChunk ?? (() => {}));
}
