import {
  dashscopeFetch,
  extractMediaUrl,
  getDashScopeApiBaseUrl,
} from "@/lib/dashscope-media";

const imageModel = process.env.QWEN_IMAGE_MODEL ?? "qwen-image-2.0-pro";

type ArtDirectorInput = {
  context?: string;
  productImageUrl?: string;
};

export async function runArtDirector({
  context = "",
  productImageUrl,
}: ArtDirectorInput = {}): Promise<{ imageUrl: string; rationale: string }> {
  const prompt = [
    "Create a premium ecommerce lifestyle image grounded in the user's product reference.",
    productImageUrl
      ? "Use the attached product image as the visual reference. Preserve the product shape, color, packaging, and visible label details without inventing a different product."
      : "No product image was provided; do not invent a specific branded product.",
    context,
  ]
    .filter(Boolean)
    .join("\n\n");

  const apiBaseUrl = getDashScopeApiBaseUrl();
  const response = await dashscopeFetch(
    `${apiBaseUrl}/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      body: JSON.stringify({
        model: imageModel,
        input: {
          messages: [
            {
              role: "user",
              content: [
                ...(productImageUrl ? [{ image: productImageUrl }] : []),
                { text: prompt },
              ],
            },
          ],
        },
        parameters: {
          n: 1,
          negative_prompt:
            "low quality, blurry, distorted product, changed logo, unreadable label, extra artifacts",
          prompt_extend: true,
          size: "1024*1024",
          watermark: false,
        },
      }),
    },
    { async: false },
  );

  const imageUrl = extractMediaUrl(response);

  return {
    imageUrl,
    rationale: [
      "### Art Direction",
      "- Preserved the uploaded product as the hero subject.",
      "- Built a premium lifestyle scene around the product context and launch notes.",
      "- Prioritized clean composition, usable ad/store crop, and high perceived product value.",
    ].join("\n"),
  };
}
