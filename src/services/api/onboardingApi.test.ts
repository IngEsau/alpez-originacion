import { describe, expect, it } from "vitest";
import { mapConsultBureauResponse, normalizeApiEnvelope } from "./onboardingApi";

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

describe("mapConsultBureauResponse", () => {
  it("maps an approved preliminary response", () => {
    expect(
      mapConsultBureauResponse({
        code: 200,
        success: true,
        trace_id: "trace-1",
        mensaje: "Score suficiente, pendiente de continuar el proceso",
        data: {
          aprobado_preliminar: true,
          score: 720,
          folio: "ORIG-2026-000001",
          estatus_seguimiento: "EN_REVISION",
        },
      }),
    ).toEqual({
      aprobadoPreliminar: true,
      score: 720,
      folio: "ORIG-2026-000001",
      estatusSeguimiento: "EN_REVISION",
      mensaje: "Score suficiente, pendiente de continuar el proceso",
    });
  });

  it("preserves approved preliminary false as a valid rejected result", () => {
    expect(
      mapConsultBureauResponse({
        code: 200,
        success: true,
        trace_id: "trace-1",
        mensaje: "Solicitud rechazada",
        data: {
          aprobado_preliminar: false,
          score: 420,
          folio: "ORIG-2026-000001",
          estatus_seguimiento: "RECHAZADA",
        },
      }),
    ).toEqual({
      aprobadoPreliminar: false,
      score: 420,
      folio: "ORIG-2026-000001",
      estatusSeguimiento: "RECHAZADA",
      mensaje: "Solicitud rechazada",
    });
  });

  it("throws when approved preliminary is not boolean", () => {
    expect(() =>
      mapConsultBureauResponse({
        code: 200,
        success: true,
        trace_id: "trace-1",
        data: { aprobado_preliminar: null },
      }),
    ).toThrow("Respuesta de evaluación inválida.");
  });
});
