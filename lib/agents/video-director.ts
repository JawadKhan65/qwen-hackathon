import {
  dashscopeFetch,
  extractMediaUrl,
  getDashScopeApiBaseUrl,
  pollTask,
} from "@/lib/dashscope-media";

const videoModel = process.env.QWEN_VIDEO_MODEL ?? "wan2.6-i2v-flash";

/**
 * Synchronous local function to determine the video motion style parameters.
 * Zero external API calls. Runs instantly and outputs structural parameters
 * for downstream nodes (like the Scriptwriter).
 */
export function decideMotionStyle(context: string): { rationale: string } {
  const isCinematic = /cinematic|slow|luxury/i.test(context);

  const rationale = isCinematic
    ? [
        "### 🎬 Motion Style Handoff (READ THIS: Scriptwriter must adapt voiceover energy to match)",
        "- **Pacing:** Slow-paced cinematic pan — continuous camera motion, smooth glide.",
        "- **Energy level:** LOW to MEDIUM — sophisticated, flow-driven, premium.",
        "- **Tone:** Luxury, calm, majestic.",
        "- **Key visual moments:** Product hero introduction → sweeping detail reveal → elegant lighting shift.",
        "- **Audio implication:** Voiceover must be smooth, atmospheric, paced. Elegant pauses.",
        "- **Scriptwriter instruction:** Write 15-25 words of flowing narration. Elevate the tone. Think: 'Crafted for those who value detail.' NOT: 'Get it now!'",
      ].join("\n")
    : [
        "### 🎬 Motion Style Handoff (READ THIS: Scriptwriter must adapt voiceover energy to match)",
        "- **Pacing:** Fast-cut product montage — 3-5 rapid scene changes in 5 seconds.",
        "- **Energy level:** HIGH — kinetic, urgent, momentum-driven.",
        "- **Tone:** Premium but accessible. Launch energy, not luxury slowness.",
        "- **Key visual moments:** Product hero reveal → lifestyle context → product close-up → brand lock-up.",
        "- **Audio implication:** Voiceover must be SHORT, punchy, staccato. No long sentences. Each word hits on a cut.",
        "- **Scriptwriter instruction:** Write 10-15 words MAX. Short bursts. Think: 'Stop. Look. This changes everything.' NOT: 'Introducing our new premium water bottle designed for the modern athlete.'",
      ].join("\n");

  return { rationale };
}

/**
 * Dispatches the video rendering task to DashScope.
 * Returns the taskId immediately without awaiting polling.
 */
export async function startVideoRender(
  imageUrl: string,
  context: string,
): Promise<string> {
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
        duration: 5, // Task 3: Changed from 10 to 5 seconds to reduce synthesis latency and match 3-5s prompt requests
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
  return taskId;
}

/**
 * Polls the dispatched DashScope video rendering task until completion.
 * Returns the resolved video URL.
 */
export async function resolveVideoRender(taskId: string): Promise<string> {
  const apiBaseUrl = getDashScopeApiBaseUrl();
  const response = await pollTask(taskId, `${apiBaseUrl}/tasks`);
  return extractMediaUrl(response);
}
