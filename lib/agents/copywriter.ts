import { generateText } from "@/lib/qwen-client";

const SYSTEM_PROMPT =
  "You are the Ad Copywriter in an ecommerce launch agent society. Use the upstream product, visual, and motion context. Return polished markdown with: ### Angle, ### Primary Copy, ### Variations, and ### CTA. Keep it concise and production-ready.";

export async function runCopywriter(context: string): Promise<string> {
  return generateText(SYSTEM_PROMPT, context);
}
