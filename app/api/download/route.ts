const ALLOWED_HOST_SUFFIXES = [
  ".aliyuncs.com",
  ".aliyun.com",
  ".qwencloud.com",
];

function sanitizeFilename(value: string | null, fallback: string): string {
  const filename = value?.trim() || fallback;
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

function isAllowedUrl(url: URL): boolean {
  if (url.protocol !== "https:") {
    return false;
  }

  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => url.hostname === suffix.slice(1) || url.hostname.endsWith(suffix),
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const source = requestUrl.searchParams.get("url");

  if (!source) {
    return Response.json({ error: "Missing url parameter." }, { status: 400 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return Response.json({ error: "Invalid url parameter." }, { status: 400 });
  }

  if (!isAllowedUrl(sourceUrl)) {
    return Response.json({ error: "Download host is not allowed." }, { status: 400 });
  }

  const upstream = await fetch(sourceUrl, { cache: "no-store" });

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: `Unable to download asset: ${upstream.status}` },
      { status: upstream.status || 502 },
    );
  }

  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  const filename = sanitizeFilename(
    requestUrl.searchParams.get("filename"),
    sourceUrl.pathname.split("/").pop() || "launchgrid-asset",
  );

  return new Response(upstream.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType,
    },
  });
}
