import { describe, expect, it, vi } from "vitest";
import { ApiRequestError, apiRequest } from "../http/httpClient";
import { mapValidateSmsResponse, validateSms } from "./onboardingApi";

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
  it("maps an invalid code returned inside a successful HTTP response as a business result", () => {
    expect(mapValidateSmsResponse({
      code: 422,
      success: false,
      trace_id: "trace-1",
      mensaje: "El código de verificación no es correcto",
      data: { valid: false },
    })).toEqual({
      valid: false,
      message: "El código de verificación no es correcto",
    });
  });

  it("returns invalid without throwing when HTTP succeeds with a 422 business envelope", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({
      code: 422,
      success: false,
      trace_id: "trace-1",
      mensaje: "El código de verificación no es correcto",
      data: { valid: false },
    });

    await expect(validateSms({ trace_id: "trace-1", codigo: "000000" })).resolves.toEqual({
      valid: false,
      message: "El código de verificación no es correcto",
    });
  });

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

  it("handles 422 business validation even when the error is ApiRequestError-like", async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce({
      status: 422,
      body: {
        code: 422,
        success: false,
        trace_id: "trace-1",
        mensaje: "El código de verificación no es correcto",
        data: { valid: false },
      },
    });

    await expect(validateSms({ trace_id: "trace-1", codigo: "123456" })).resolves.toEqual({
      valid: false,
      message: "El código de verificación no es correcto",
    });
  });
});
