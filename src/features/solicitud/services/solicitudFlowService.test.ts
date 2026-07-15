import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSolicitudFlow,
  getSolicitudFlowByRecoveryFolio,
  isSmsVerificationApproved,
  SOLICITUD_RECOVERY_TTL_MS,
  saveBusinessData,
  saveFiscalIdentity,
  saveIneFile,
} from "./solicitudFlowService";

function stubBrowserStorage() {
  const store = new Map<string, string>();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
    setTimeout: (callback: () => void) => {
      callback();
      return 0;
    },
    clearTimeout: () => undefined,
  });
  return store;
}

function stubQuotaBrowserStorage() {
  const store = new Map<string, string>();
  let maxValueLength = Number.POSITIVE_INFINITY;

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (value.length > maxValueLength) throw new Error("Storage quota exceeded");
        store.set(key, value);
      },
      removeItem: (key: string) => store.delete(key),
    },
    setTimeout: (callback: () => void) => {
      callback();
      return 0;
    },
    clearTimeout: () => undefined,
  });

  return {
    store,
    setMaxValueLength(value: number) {
      maxValueLength = value;
    },
  };
}

describe("solicitudFlowService recovery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a recovery folio and resumes the same flow", async () => {
    stubBrowserStorage();
    const flow = await createSolicitudFlow();
    const recovered = await getSolicitudFlowByRecoveryFolio(flow.recoveryFolio.toLowerCase());

    expect(flow.recoveryFolio).toMatch(/^ALP-\d{8}-[A-Z0-9]{6}$/);
    expect(new Date(flow.expiresAt).getTime() - new Date(flow.updatedAt).getTime()).toBe(SOLICITUD_RECOVERY_TTL_MS);
    expect(recovered?.flowId).toBe(flow.flowId);
  });

  it("removes an expired flow instead of resuming it", async () => {
    const store = stubBrowserStorage();
    const flow = await createSolicitudFlow();
    const stored = JSON.parse(store.get("alpez_public_solicitud_flows") ?? "[]") as Array<Record<string, unknown>>;
    stored[0] = { ...stored[0], expiresAt: "2020-01-01T00:00:00.000Z" };
    store.set("alpez_public_solicitud_flows", JSON.stringify(stored));

    await expect(getSolicitudFlowByRecoveryFolio(flow.recoveryFolio)).resolves.toBeNull();
  });

  it("compacts file payloads from previous flows when browser storage reaches its quota", async () => {
    const { store, setMaxValueLength } = stubQuotaBrowserStorage();
    const previousFlow = await createSolicitudFlow();
    const storageKey = "alpez_public_solicitud_flows";
    const stored = JSON.parse(store.get(storageKey) ?? "[]") as Array<Record<string, unknown>>;
    stored[0] = {
      ...stored[0],
      backendTraceId: "backend-trace",
      ineFront: { name: "frente.jpg", type: "image/jpeg", size: 40_000, previewUrl: `data:image/jpeg;base64,${"a".repeat(40_000)}` },
      ineBack: { name: "reverso.jpg", type: "image/jpeg", size: 40_000, previewUrl: `data:image/jpeg;base64,${"b".repeat(40_000)}` },
    };
    store.set(storageKey, JSON.stringify(stored));
    setMaxValueLength(20_000);

    await createSolicitudFlow();

    const compacted = JSON.parse(store.get(storageKey) ?? "[]") as Array<{
      flowId: string;
      ineFront?: { previewUrl?: string };
      ineBack?: { previewUrl?: string };
    }>;
    const archived = compacted.find((flow) => flow.flowId === previousFlow.flowId);
    expect(compacted).toHaveLength(2);
    expect(archived?.ineFront?.previewUrl).toBeUndefined();
    expect(archived?.ineBack?.previewUrl).toBeUndefined();
  });

  it("returns a friendly message when the current image still cannot be persisted", async () => {
    const { store, setMaxValueLength } = stubQuotaBrowserStorage();
    const flow = await createSolicitudFlow();
    const storageKey = "alpez_public_solicitud_flows";
    const currentSize = store.get(storageKey)?.length ?? 0;
    setMaxValueLength(currentSize + 200);

    await expect(saveIneFile(flow.flowId, "front", {
      name: "ine-frente.jpg",
      type: "image/jpeg",
      size: 10_000,
      previewUrl: `data:image/jpeg;base64,${"a".repeat(10_000)}`,
    })).rejects.toThrow("No pudimos guardar este archivo en el dispositivo");
  });
});

describe("solicitudFlowService fiscal identity step", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("advances to business data after confirming RFC and CURP", async () => {
    stubBrowserStorage();
    const flow = await createSolicitudFlow();

    const updated = await saveFiscalIdentity(flow.flowId, {
      rfc: "GAGE950615GT1",
      curp: "GAGE950615HPLNYR01",
      source: "manual",
      confirmed: false,
    });

    expect(updated.currentStep).toBe("datos_negocio");
    expect(updated.fiscalIdentity.confirmed).toBe(true);
    expect(updated.basicData.rfc).toBe("GAGE950615GT1");
    expect(updated.basicData.curp).toBe("GAGE950615HPLNYR01");
  });
});

describe("solicitudFlowService business data step", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("advances directly to optional documents after business data", async () => {
    stubBrowserStorage();
    const flow = await createSolicitudFlow();

    const updated = await saveBusinessData(flow.flowId, {
      activity: "Comercio",
      seniorityYears: "3",
      monthlyIncome: "45000",
      annualSales: "540000",
    });

    expect(updated.currentStep).toBe("documentos");
  });
});

describe("solicitudFlowService SMS validation", () => {
  it("only approves the SMS validation when backend valid is boolean true", () => {
    expect(isSmsVerificationApproved({ valid: true })).toBe(true);
    expect(isSmsVerificationApproved({ valid: false })).toBe(false);
    expect(isSmsVerificationApproved({ valid: "true" })).toBe(false);
    expect(isSmsVerificationApproved({ valid: "false" })).toBe(false);
    expect(isSmsVerificationApproved({ valid: undefined })).toBe(false);
  });
});
