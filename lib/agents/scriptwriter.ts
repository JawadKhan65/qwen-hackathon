import { generateText } from "@/lib/qwen-client";

const SYSTEM_PROMPT =
  "You are the Scriptwriter in an ecommerce launch agent society. Use the upstream product, image, video, and campaign context. Return polished markdown with: ### Hook, ### 5-Second Beat Sheet, ### On-Screen Text, and ### Closing Line.";

export async function runScriptwriter(context: string): Promise<string> {
  return generateText(SYSTEM_PROMPT, context);
}
