import { generateStreamingText } from "@/lib/qwen-client";

const SYSTEM_PROMPT =
  "You are the Copywriter in an ecommerce launch agent society. Use the upstream product, image, and campaign context. Return polished markdown with: ### Hook, ### Primary Ad Copy, ### CTA, and ### Tone Notes.";

export async function runCopywriter(
  context: string,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  return generateStreamingText(SYSTEM_PROMPT, context, onChunk ?? (() => {}));
}
