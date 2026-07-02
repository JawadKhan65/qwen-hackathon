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
    "Create a premium ecommerce lifestyle scene using the uploaded product image as the direct subject reference.",
    productImageUrl
      ? "CRITICAL: The attached image is the EXACT product. Do NOT redesign the container, change its branding, alter the logo, or replace it with a different bottle/box/item. Keep the exact colors, label layout, and shape. Place this exact product realistically into the lifestyle background described below."
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
            "low quality, blurry, distorted product, changed logo, modified packaging, unreadable label, extra artifacts, different product shape",
          // Disable prompt expansion to prevent the model from ignoring the reference image
          prompt_extend: productImageUrl ? false : true,
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
