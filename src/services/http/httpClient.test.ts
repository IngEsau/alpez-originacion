import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, apiRequest, buildApiUrl } from "./httpClient";

describe("buildApiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("joins base URL and path without double slash", () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://dev.alpez.lercomx.com/web/");

    expect(buildApiUrl("/v1/onboarding/iniciar")).toBe("https://dev.alpez.lercomx.com/web/v1/onboarding/iniciar");
    expect(buildApiUrl("v1/onboarding/iniciar")).toBe("https://dev.alpez.lercomx.com/web/v1/onboarding/iniciar");
  });

  it("fails with a controlled error when base URL is empty", () => {
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(() => buildApiUrl("/v1/onboarding/iniciar")).toThrow(ApiRequestError);
  });

  it("deduplicates identical POST requests while the first one is in flight", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.alpez.test");
    let resolveResponse: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    }));
    vi.stubGlobal("fetch", fetchMock);

    const options = { method: "POST", body: JSON.stringify({ trace_id: "trace-1" }) };
    const first = apiRequest<{ success: boolean }>("/v1/onboarding/consultar-buro", options);
    const second = apiRequest<{ success: boolean }>("/v1/onboarding/consultar-buro", options);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveResponse?.(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { success: true },
      { success: true },
    ]);

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    await apiRequest("/v1/onboarding/consultar-buro", options);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
