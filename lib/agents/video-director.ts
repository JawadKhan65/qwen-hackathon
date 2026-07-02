import {
  dashscopeFetch,
  extractMediaUrl,
  getDashScopeApiBaseUrl,
  pollTask,
} from "@/lib/dashscope-media";

const videoModel = process.env.QWEN_VIDEO_MODEL ?? "wan2.6-i2v-flash";

export async function runVideoDirector(
  imageUrl?: string,
  context = "",
): Promise<{ videoUrl: string; rationale: string }> {
  if (!imageUrl) {
    throw new Error("Video Director requires an upstream lifestyle image.");
  }

  const apiBaseUrl = getDashScopeApiBaseUrl();
  const response = await dashscopeFetch(`${apiBaseUrl}/services/aigc/video-generation/video-synthesis`, {
    method: "POST",
    body: JSON.stringify({
      model: videoModel,
      input: {
        prompt: [
          "Create a 3-5 second polished ecommerce product launch video from the provided lifestyle image.",
          "Use subtle camera motion, premium lighting, and preserve the product identity from the image.",
          context,
        ]
          .filter(Boolean)
          .join("\n\n"),
        img_url: imageUrl,
      },
      parameters: {
        audio: false,
        duration: 10,
        prompt_extend: true,
        resolution: "720P",
        watermark: false,
      },
    }),
  });

  const taskId = response.output?.task_id;
  if (!taskId) {
    throw new Error("Wan video generation did not return a task id.");
  }

  const videoUrl = extractMediaUrl(await pollTask(taskId, `${apiBaseUrl}/tasks`));

  return {
    videoUrl,
    rationale: [
      "### 🎬 Motion Style Handoff (READ THIS: Scriptwriter must adapt voiceover energy to match)",
      "- **Pacing:** Fast-cut product montage — 3-5 rapid scene changes in 5 seconds.",
      "- **Energy level:** HIGH — kinetic, urgent, momentum-driven.",
      "- **Tone:** Premium but accessible. Launch energy, not luxury slowness.",
      "- **Key visual moments:** Product hero reveal → lifestyle context → product close-up → brand lock-up.",
      "- **Audio implication:** Voiceover must be SHORT, punchy, staccato. No long sentences. Each word hits on a cut.",
      "- **Scriptwriter instruction:** Write 10-15 words MAX. Short bursts. Think: 'Stop. Look. This changes everything.' NOT: 'Introducing our new premium water bottle designed for the modern athlete.'",
    ].join("\n"),
  };
}
