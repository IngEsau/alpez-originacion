import { afterEach, describe, expect, it, vi } from "vitest";
import { createSolicitudFlow, isSmsVerificationApproved, saveBusinessData, saveFiscalIdentity } from "./solicitudFlowService";

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
}

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
