import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";

const qwenTextModel = process.env.QWEN_TEXT_MODEL ?? "qwen3.7-plus";

function getQwenClient() {
  const apiKey =
    process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;

  if (!apiKey) {
    throw new Error("Missing DASHSCOPE_API_KEY");
  }

  return new OpenAI({
    apiKey,
    baseURL:
      process.env.DASHSCOPE_COMPATIBLE_BASE_URL ??
      process.env.DASHSCOPE_BASE_URL ??
      "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  });
}

export async function generateText(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey =
    process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;

  if (!apiKey) {
    return buildFallbackText(systemPrompt, userPrompt);
  }

  try {
    const client = getQwenClient();

    const completion = await client.chat.completions.create({
      model: qwenTextModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    return typeof content === "string"
      ? content
      : buildFallbackText(systemPrompt, userPrompt);
  } catch {
    return buildFallbackText(systemPrompt, userPrompt);
  }
}

/**
 * Streaming generation
 */
export async function generateStreamingText(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (chunk: string) => void,
): Promise<string> {
  const apiKey =
    process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;

  if (!apiKey) {
    const text = buildFallbackText(systemPrompt, userPrompt);
    onChunk(text);
    return text;
  }

  try {
    const client = getQwenClient();

    const stream = await client.chat.completions.create({
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

      // Flush only when the buffer tail ends with sentence-final punctuation followed
      // by whitespace or end-of-content — prevents mid-word periods ("U.S.", "e.g.")
      // from triggering a premature flush. Hard cap at 150 chars prevents runaway buffers.
      const tail = buffer.slice(-6);
      const hasSentenceEnd = /[.!?](?:\s|$)/.test(tail);
      if (hasSentenceEnd || buffer.length >= 150) {
        const trimmed = buffer.trim();
        if (trimmed) onChunk(trimmed);
        buffer = "";
      }
    }

    if (buffer.trim()) {
      onChunk(buffer.trim());
    }

    return full;
  } catch {
    const text = buildFallbackText(systemPrompt, userPrompt);
    onChunk(text);
    return text;
  }
}

/**
 * Multimodal (image + text)
 */
export async function generateMultimodalText(
  systemPrompt: string,
  userPrompt: string,
  imageUrl?: string,
): Promise<string> {
  if (!imageUrl) {
    return generateText(systemPrompt, userPrompt);
  }

  const apiKey =
    process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;

  if (!apiKey) {
    return buildFallbackText(systemPrompt, userPrompt);
  }

  try {
    const client = getQwenClient();

    const completion = await client.chat.completions.create({
      model: qwenTextModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ] satisfies ChatCompletionContentPart[],
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    return typeof content === "string"
      ? content
      : buildFallbackText(systemPrompt, userPrompt);
  } catch {
    return generateText(systemPrompt, userPrompt);
  }
}

/**
 * Streaming multimodal (image + text)
 */
export async function generateStreamingMultimodalText(
  systemPrompt: string,
  userPrompt: string,
  imageUrl: string | undefined,
  onChunk: (chunk: string) => void,
): Promise<string> {
  if (!imageUrl) {
    return generateStreamingText(systemPrompt, userPrompt, onChunk);
  }

  const apiKey =
    process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;

  if (!apiKey) {
    const text = buildFallbackText(systemPrompt, userPrompt);
    onChunk(text);
    return text;
  }

  try {
    const client = getQwenClient();

    const stream = await client.chat.completions.create({
      model: qwenTextModel,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ] satisfies ChatCompletionContentPart[],
        },
      ],
    });

    let full = "";
    let buffer = "";

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (!token) continue;

      full += token;
      buffer += token;

      // Same sentence-boundary logic as the text-only stream above.
      const tail = buffer.slice(-6);
      const hasSentenceEnd = /[.!?](?:\s|$)/.test(tail);
      if (hasSentenceEnd || buffer.length >= 150) {
        const trimmed = buffer.trim();
        if (trimmed) onChunk(trimmed);
        buffer = "";
      }
    }

    if (buffer.trim()) {
      onChunk(buffer.trim());
    }

    return full;
  } catch {
    return generateStreamingText(systemPrompt, userPrompt, onChunk);
  }
}

/**
 * Fallback (safe for build-time)
 */
function buildFallbackText(
  systemPrompt: string,
  userPrompt: string,
): string {
  const promptSummary = userPrompt.trim().slice(0, 180);
  const role =
    systemPrompt.trim().split("\n")[0]?.trim() || "Agent";

  return [
    `${role} output unavailable.`,
    promptSummary
      ? `Input received: ${promptSummary}`
      : "No user-provided context was available for this node.",
  ].join("\n");
}
