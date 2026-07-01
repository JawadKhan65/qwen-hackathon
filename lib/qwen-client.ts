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
