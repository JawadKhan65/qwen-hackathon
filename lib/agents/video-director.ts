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
        duration: 5,
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
      "### Motion Direction",
      "- Animated from the generated lifestyle image to preserve visual continuity.",
      "- Chose a short, silent, polished launch motion suitable for product pages and paid social.",
      "- Kept motion restrained so downstream copy/script agents can align messaging to the visual pacing.",
    ].join("\n"),
  };
}
