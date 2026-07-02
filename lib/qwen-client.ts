import OpenAI from "openai";

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

      if (/[.\n!?]/.test(token) || buffer.length >= 70) {
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
          ] as any,
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