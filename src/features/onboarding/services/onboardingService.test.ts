import { describe, expect, it, vi } from "vitest";
import {
  isApiFallbackEnabled,
  isRealApiEnabled,
  mapBackendDocumentsToSolicitudDocuments,
  mapRequiredDocumentsResult,
  resolveApiOrMock,
} from "./onboardingService";
import { ApiRequestError } from "../../../services/http/httpClient";

describe("onboarding api configuration", () => {
  it("enables real api and fallback only with explicit true string", () => {
    expect(isRealApiEnabled("true")).toBe(true);
    expect(isRealApiEnabled("false")).toBe(false);
    expect(isRealApiEnabled(undefined)).toBe(false);
    expect(isApiFallbackEnabled("true")).toBe(true);
    expect(isApiFallbackEnabled("false")).toBe(false);
    expect(isApiFallbackEnabled(undefined)).toBe(false);
  });

  it("uses mock fallback when real api is disabled", async () => {
    const apiCall = vi.fn(async () => "api");
    const fallback = vi.fn(async () => "mock");

    await expect(
      resolveApiOrMock({
        useRealApi: false,
        fallbackToMock: false,
        operation: "test",
        apiCall,
        fallback,
      }),
    ).resolves.toBe("mock");

    expect(apiCall).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("falls back to mock when real api fails and fallback is enabled", async () => {
    const onFallback = vi.fn();

    await expect(
      resolveApiOrMock({
        useRealApi: true,
        fallbackToMock: true,
        operation: "test",
        apiCall: async () => {
          throw new Error("offline");
        },
        fallback: async () => "mock",
        onFallback,
      }),
    ).resolves.toBe("mock");

    expect(onFallback).toHaveBeenCalledWith("test", expect.any(Error));
  });

  it("throws a friendly message when real api fails and fallback is disabled", async () => {
    await expect(
      resolveApiOrMock({
        useRealApi: true,
        fallbackToMock: false,
        operation: "saveGeneralData",
        apiCall: async () => {
          throw new Error("API base URL is not configured.");
        },
        fallback: async () => "mock",
      }),
    ).rejects.toThrow("No pudimos guardar tus datos. Intenta nuevamente.");
  });

  it("does not fallback to mock for business validation errors", async () => {
    const fallback = vi.fn(async () => "mock");

    await expect(
      resolveApiOrMock({
        useRealApi: true,
        fallbackToMock: true,
        operation: "validateSms",
        apiCall: async () => {
          throw new ApiRequestError(422, "El código de verificación no es correcto", {
            success: false,
            data: { valid: false },
          });
        },
        fallback,
      }),
    ).rejects.toThrow("No pudimos confirmar el código. Intenta nuevamente.");

    expect(fallback).not.toHaveBeenCalled();
  });
});

describe("mapBackendDocumentsToSolicitudDocuments", () => {
  it("maps backend documents into public onboarding document items", () => {
    const documents = mapBackendDocumentsToSolicitudDocuments({
      solicitante: [
        {
          id: 10,
          clave: "CURP",
          nombre: "CURP",
          requerido: "1",
          cargado: true,
        },
      ],
      aval: [
        {
          id: "aval-ine",
          clave: "INE_AVAL_FRONTAL",
          nombre: "INE del aval",
          requerido: "0",
          condicionado_a: "AVAL",
        },
      ],
    });

    expect(documents).toEqual([
      expect.objectContaining({
        id: "solicitante_10",
        backendDocumentId: 10,
        backendKey: "CURP",
        label: "CURP",
        applicationType: "curp",
        status: "uploaded",
        optional: false,
      }),
      expect.objectContaining({
        id: "aval_aval-ine",
        backendDocumentId: "aval-ine",
        backendKey: "INE_AVAL_FRONTAL",
        backendCondition: "AVAL",
        label: "INE del aval",
        applicationType: "ine_aval",
        optional: true,
      }),
    ]);
  });

  it("maps backend document progress", () => {
    const result = mapRequiredDocumentsResult({
      solicitante: [],
      aval: [],
      garantia: [],
      progreso: {
        total_requeridos: 8,
        total_cargados: 3,
        completado: false,
      },
    });

    expect(result.progress).toEqual({
      totalRequired: 8,
      totalUploaded: 3,
      completed: false,
    });
  });
});
