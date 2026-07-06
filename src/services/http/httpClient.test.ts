import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, buildApiUrl } from "./httpClient";

describe("buildApiUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
});
