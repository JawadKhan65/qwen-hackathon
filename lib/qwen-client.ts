import OpenAI from "openai";

const dashscopeApiKey = process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;
const dashscopeBaseUrl =
  process.env.DASHSCOPE_COMPATIBLE_BASE_URL ??
  process.env.DASHSCOPE_BASE_URL ??
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const qwenTextModel = process.env.QWEN_TEXT_MODEL ?? "qwen3.7-plus";

const qwenClient = new OpenAI({
  apiKey: dashscopeApiKey,
  baseURL: dashscopeBaseUrl,
});

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  if (!dashscopeApiKey) {
    return buildFallbackText(systemPrompt, userPrompt);
  }

  try {
    const completion = await qwenClient.chat.completions.create({
      model: qwenTextModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (typeof content === "string") {
      return content;
    }

    return buildFallbackText(systemPrompt, userPrompt);
  } catch {
    return buildFallbackText(systemPrompt, userPrompt);
  }
}

/**
 * Streams tokens from the LLM directly into `onChunk` as they arrive.
 * Chunks are buffered and flushed at sentence breaks or ~70 chars so the
 * society log stays readable instead of filling with single characters.
 * Returns the full completed text when done.
 * ⚠️ This IS the agent call — zero extra API requests.
 */
export async function generateStreamingText(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  if (!dashscopeApiKey) {
    const text = buildFallbackText(systemPrompt, userPrompt);
    onChunk(text);
    return text;
  }

  try {
    const stream = await qwenClient.chat.completions.create({
      model: qwenTextModel,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    let full = "";
    let buffer = "";

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (!token) continue;
      full += token;
      buffer += token;
      // Flush on sentence break or once buffer is long enough
      if (/[.\n!?]/.test(token) || buffer.length >= 70) {
        const trimmed = buffer.trim();
        if (trimmed) onChunk(trimmed);
        buffer = "";
      }
    }

    const remaining = buffer.trim();
    if (remaining) onChunk(remaining);

    return full;
  } catch {
    const text = buildFallbackText(systemPrompt, userPrompt);
    onChunk(text);
    return text;
  }
}

export async function generateMultimodalText(
  systemPrompt: string,
  userPrompt: string,
  imageUrl?: string,
): Promise<string> {
  if (!dashscopeApiKey || !imageUrl) {
    return generateText(systemPrompt, userPrompt);
  }

  try {
    const completion = await qwenClient.chat.completions.create({
      model: qwenTextModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ] as never,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    return typeof content === "string" ? content : buildFallbackText(systemPrompt, userPrompt);
  } catch {
    return generateText(systemPrompt, userPrompt);
  }
}

function buildFallbackText(systemPrompt: string, userPrompt: string): string {
  const promptSummary = userPrompt.trim().slice(0, 180);
  const role = systemPrompt.trim().split("\n")[0]?.trim() || "Agent";

  return [
    `${role} output unavailable.`,
    promptSummary
      ? `Input received: ${promptSummary}`
      : "No user-provided context was available for this node.",
  ].join("\n");
}
