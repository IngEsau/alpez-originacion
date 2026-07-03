import { afterEach, describe, expect, it, vi } from "vitest";
import { createSolicitudFlow, saveFiscalIdentity } from "./solicitudFlowService";

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
