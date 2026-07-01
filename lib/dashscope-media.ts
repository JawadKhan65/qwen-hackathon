type DashScopeTaskResponse = {
  output?: {
    choices?: Array<{
      message?: {
        content?: Array<Record<string, unknown>>;
      };
    }>;
    task_id?: string;
    task_status?: string;
    results?: Array<Record<string, unknown>>;
    video_url?: string;
    image_url?: string;
    url?: string;
  };
  message?: string;
  code?: string;
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 80;
const DEFAULT_API_BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";

export function getDashScopeApiBaseUrl(): string {
  return (
    process.env.DASHSCOPE_API_BASE_URL ??
    process.env.QWEN_API_BASE_URL ??
    DEFAULT_API_BASE_URL
  ).replace(/\/$/, "");
}

function getApiKey(): string {
  const apiKey = process.env.DASHSCOPE_API_KEY ?? process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY or QWEN_API_KEY is not configured.");
  }
  return apiKey;
}

export async function dashscopeFetch(
  apiUrl: string,
  init: RequestInit,
  options: { async?: boolean } = {},
): Promise<DashScopeTaskResponse> {
  const isGet = init.method?.toUpperCase() === "GET";
  const useAsync = options.async ?? !isGet;
  const response = await fetch(apiUrl, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(useAsync ? { "X-DashScope-Async": "enable" } : {}),
      ...init.headers,
    },
  });

  const json = (await response.json()) as DashScopeTaskResponse;

  if (!response.ok) {
    const message = json.message ?? json.code ?? `DashScope request failed: ${response.status}`;
    const endpoint = new URL(apiUrl).hostname;
    throw new Error(`${message} (${response.status}, ${endpoint})`);
  }

  return json;
}

export async function pollTask(
  taskId: string,
  apiUrl: string,
): Promise<DashScopeTaskResponse> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt += 1) {
    const response = await dashscopeFetch(`${apiUrl}/${taskId}`, {
      method: "GET",
    });

    const status = response.output?.task_status;

    if (status === "SUCCEEDED") {
      return response;
    }

    if (status === "FAILED" || status === "CANCELED") {
      throw new Error(response.message ?? `DashScope task ${status.toLowerCase()}.`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("DashScope task polling timed out.");
}

export function extractMediaUrl(response: DashScopeTaskResponse): string {
  const output = response.output;
  const firstChoiceContent = output?.choices?.[0]?.message?.content ?? [];
  const firstResult = output?.results?.[0];
  const url =
    output?.video_url ??
    output?.image_url ??
    output?.url ??
    firstChoiceContent
      .map((item) => item.image)
      .find((image): image is string => typeof image === "string") ??
    (typeof firstResult?.url === "string" ? firstResult.url : undefined) ??
    (typeof firstResult?.video_url === "string" ? firstResult.video_url : undefined) ??
    (typeof firstResult?.image_url === "string" ? firstResult.image_url : undefined);

  if (!url) {
    throw new Error("DashScope response did not include a media URL.");
  }

  return url;
}
