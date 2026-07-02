import { describe, expect, it } from "vitest";
import {
  parseDemoCreditScenario,
  resolveDemoCreditScenario,
} from "./demoCreditScenario";

describe("resolveDemoCreditScenario", () => {
  it("forces physical rejection by score", () => {
    expect(resolveDemoCreditScenario("pf-rejected-score", "fisica")).toEqual({
      bureauHasHit: true,
      bureauScore: 610,
    });
  });

  it("forces moral rejection by score", () => {
    expect(resolveDemoCreditScenario("pm-rejected-score", "moral")).toEqual({
      bureauHasHit: true,
      bureauScore: 480,
    });
  });

  it("forces no credit history for any person type", () => {
    expect(resolveDemoCreditScenario("no-credit-history", "fisica")).toEqual({
      bureauHasHit: false,
      bureauScore: null,
    });
    expect(resolveDemoCreditScenario("no-credit-history", "moral")).toEqual({
      bureauHasHit: false,
      bureauScore: null,
    });
  });

  it("does not mix physical-only scenarios with moral rules", () => {
    expect(resolveDemoCreditScenario("pf-rejected-score", "moral")).toBeNull();
  });

  it("does not mix moral-only scenarios with physical rules", () => {
    expect(resolveDemoCreditScenario("pm-rejected-score", "fisica")).toBeNull();
  });
});

describe("parseDemoCreditScenario", () => {
  it("ignores unknown values", () => {
    expect(parseDemoCreditScenario("unknown")).toBeNull();
  });
});
