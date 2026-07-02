const DEFAULT_API_BASE_URL = "";

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).trim();
}

function buildUrl(path: string): string {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) {
    throw new ApiRequestError(0, "API base URL is not configured.");
  }
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function messageFromBody(body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = record.message ?? record.mensaje ?? record.error;
    if (typeof message === "string") return message;
  }
  if (typeof body === "string") return body;
  return "Request failed.";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });
  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiRequestError(response.status, messageFromBody(body));
  }

  return body as T;
}
