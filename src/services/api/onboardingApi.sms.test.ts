import { describe, expect, it, vi } from "vitest";
import { ApiRequestError, apiRequest } from "../http/httpClient";
import { validateSms } from "./onboardingApi";

vi.mock("../http/httpClient", () => {
  class MockApiRequestError extends Error {
    status: number;
    body: unknown;

    constructor(status: number, message: string, body?: unknown) {
      super(message);
      this.name = "ApiRequestError";
      this.status = status;
      this.body = body;
    }
  }

  return {
    ApiRequestError: MockApiRequestError,
    apiRequest: vi.fn(),
  };
});

describe("validateSms", () => {
  it("returns a normal invalid result for backend 422 business validation", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new ApiRequestError(422, "El código de verificación no es correcto", {
      code: 422,
      success: false,
      trace_id: null,
      mensaje: "El código de verificación no es correcto",
      data: { valid: false },
    }));

    await expect(validateSms({ trace_id: "trace-1", codigo: "000000" })).resolves.toEqual({
      valid: false,
      message: "El código de verificación no es correcto",
    });
  });
});
