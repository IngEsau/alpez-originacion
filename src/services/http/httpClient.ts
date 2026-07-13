const DEFAULT_API_BASE_URL = "";
const inFlightPostRequests = new Map<string, Promise<unknown>>();

export class ApiRequestError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

function apiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).trim();
}

export function buildApiUrl(path: string): string {
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

function requestKey(url: string, options: RequestInit): string | null {
  const method = (options.method ?? "GET").toUpperCase();
  if (method !== "POST" || (options.body !== undefined && typeof options.body !== "string")) return null;
  return `${method}:${url}:${options.body ?? ""}`;
}

export function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const url = buildApiUrl(path);
  const key = requestKey(url, options);
  const existingRequest = key ? inFlightPostRequests.get(key) : undefined;
  if (existingRequest) return existingRequest as Promise<T>;

  const execute = async (): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw new ApiRequestError(response.status, messageFromBody(body), body);
    }

    return body as T;
  };

  if (!key) return execute();

  let request: Promise<T>;
  request = execute().finally(() => {
    if (inFlightPostRequests.get(key) === request) inFlightPostRequests.delete(key);
  });
  inFlightPostRequests.set(key, request);
  return request;
}
