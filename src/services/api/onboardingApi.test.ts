import { describe, expect, it } from "vitest";
import { normalizeApiEnvelope } from "./onboardingApi";

describe("normalizeApiEnvelope", () => {
  it("uses message and trace_id from the envelope when data is an object", () => {
    const result = normalizeApiEnvelope({
      code: 200,
      success: true,
      trace_id: "TRC-20260702-0001",
      mensaje: "Solicitud iniciada.",
      data: { ocr: { fullName: "Cliente Demo" } },
    });

    expect(result.trace_id).toBe("TRC-20260702-0001");
    expect(result.message).toBe("Solicitud iniciada.");
    expect(result.ocr).toEqual({ fullName: "Cliente Demo" });
  });

  it("throws a friendly error when the envelope is not successful", () => {
    expect(() =>
      normalizeApiEnvelope({
        code: 422,
        success: false,
        trace_id: null,
        message: "No pudimos completar la operación.",
        data: {},
      }),
    ).toThrow("No pudimos completar la operación.");
  });
});
