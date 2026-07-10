import { describe, expect, it, vi } from "vitest";
import {
  isApiFallbackEnabled,
  isRealApiEnabled,
  mapBackendDocumentsToSolicitudDocuments,
  mapRequiredDocumentsResponse,
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

  it("does not fallback to mock for ApiRequestError-like business validation errors", async () => {
    const fallback = vi.fn(async () => "mock");

    await expect(
      resolveApiOrMock({
        useRealApi: true,
        fallbackToMock: true,
        operation: "validateSms",
        apiCall: async () => {
          throw {
            status: 422,
            body: {
              success: false,
              data: { valid: false },
            },
          };
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
          requerido: 1,
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
        backendGroup: "solicitante",
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
        backendGroup: "aval",
        optional: true,
      }),
    ]);
  });

  it("maps the real required documents response into grouped document lists", () => {
    const result = mapRequiredDocumentsResponse({
      solicitante: [
        {
          id: 1,
          clave: "INE_FRONTAL",
          nombre: "INE Frontal del solicitante",
          condicionado_a: "NINGUNO",
          requerido: 1,
          cargado: true,
        },
      ],
      aval: [
        {
          id: 6,
          clave: "COMPROBANTE_DOMICILIO_AVAL",
          nombre: "Comprobante de domicilio del aval",
          condicionado_a: "AVAL",
          requerido: "1",
          cargado: false,
        },
      ],
      garantia: [],
      progreso: {
        total_requeridos: 7,
        total_cargados: 2,
        completado: false,
      },
    });

    expect(result.holderDocuments).toEqual([
      expect.objectContaining({
        backendDocumentId: 1,
        backendKey: "INE_FRONTAL",
        backendGroup: "solicitante",
        applicationType: "ine_titular",
        status: "uploaded",
      }),
    ]);
    expect(result.avalDocuments).toEqual([
      expect.objectContaining({
        backendDocumentId: 6,
        backendCondition: "AVAL",
        backendGroup: "aval",
        applicationType: "comprobante_domicilio_aval",
        status: "missing",
      }),
    ]);
    expect(result.guaranteeDocuments).toEqual([]);
    expect(result.backendProgress).toEqual({
      totalRequired: 7,
      totalUploaded: 2,
      completed: false,
    });
  });

  it("keeps conditional backend documents separated from holder documents", () => {
    const result = mapRequiredDocumentsResponse({
      solicitante: [
        { id: 3, clave: "COMPROBANTE_DOMICILIO", nombre: "Comprobante de domicilio del solicitante", condicionado_a: "NINGUNO", requerido: 1, cargado: false },
        { id: 1, clave: "INE_FRONTAL", nombre: "INE Frontal del solicitante", condicionado_a: "NINGUNO", requerido: 1, cargado: true },
        { id: 2, clave: "INE_REVERSO", nombre: "INE Reverso del solicitante", condicionado_a: "NINGUNO", requerido: 1, cargado: true },
      ],
      aval: [
        { id: 6, clave: "COMPROBANTE_DOMICILIO_AVAL", nombre: "Comprobante de domicilio del aval", condicionado_a: "AVAL", requerido: 1, cargado: false },
      ],
      garantia: [
        { id: 7, clave: "DOCUMENTO_GARANTIA", nombre: "Documento que acredita la garantia", condicionado_a: "GARANTIA", requerido: 1, cargado: false },
      ],
      progreso: {
        total_requeridos: 7,
        total_cargados: 2,
        completado: false,
      },
    });

    expect(result.holderDocuments).toHaveLength(3);
    expect(result.holderDocuments.filter((document) => document.status !== "missing")).toHaveLength(2);
    expect(result.holderDocuments.filter((document) => document.status === "missing")).toHaveLength(1);
    expect(result.avalDocuments).toHaveLength(1);
    expect(result.guaranteeDocuments).toHaveLength(1);
    expect(result.backendProgress).toEqual({
      totalRequired: 7,
      totalUploaded: 2,
      completed: false,
    });
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
