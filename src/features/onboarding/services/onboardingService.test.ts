import { describe, expect, it, vi } from "vitest";
import {
  isApiFallbackEnabled,
  isRealApiEnabled,
  mapBackendDocumentsToSolicitudDocuments,
  resolveApiOrMock,
} from "./onboardingService";

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
    ).rejects.toThrow("No pudimos guardar este paso. Intenta nuevamente.");
  });
});

describe("mapBackendDocumentsToSolicitudDocuments", () => {
  it("maps backend documents into public onboarding document items", () => {
    const documents = mapBackendDocumentsToSolicitudDocuments({
      solicitante: [
        {
          id: 10,
          clave: "curp",
          nombre: "CURP",
          requerido: true,
        },
      ],
      aval: [
        {
          id: "aval-ine",
          clave: "ine_aval",
          nombre: "INE del aval",
          requerido: false,
        },
      ],
    });

    expect(documents).toEqual([
      expect.objectContaining({
        id: "solicitante_10",
        backendDocumentId: 10,
        backendKey: "curp",
        label: "CURP",
        applicationType: "curp",
        status: "missing",
        optional: false,
      }),
      expect.objectContaining({
        id: "aval_aval-ine",
        backendDocumentId: "aval-ine",
        backendKey: "ine_aval",
        label: "INE del aval",
        applicationType: "ine_aval",
        optional: true,
      }),
    ]);
  });
});
