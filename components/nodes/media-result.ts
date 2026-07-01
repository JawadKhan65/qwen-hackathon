export function getMediaResultUrl(result: unknown, key: "imageUrl" | "videoUrl"): string | undefined {
  if (typeof result === "string") {
    return result;
  }

  if (result && typeof result === "object" && key in result) {
    const value = (result as Record<string, unknown>)[key];
    return typeof value === "string" ? value : undefined;
  }

  return undefined;
}
