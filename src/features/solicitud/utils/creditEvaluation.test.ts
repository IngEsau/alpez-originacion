import { describe, expect, it } from "vitest";
import {
  evaluateCreditByPersonType,
  evaluateMoralPersonCredit,
  evaluatePhysicalPersonCredit,
} from "./creditEvaluation";

describe("evaluatePhysicalPersonCredit", () => {
  it.each([
    [629, "rejected", null],
    [630, "approved", 10000],
    [649, "approved", 10000],
    [650, "approved", 20000],
    [669, "approved", 20000],
    [670, "approved", 30000],
    [689, "approved", 30000],
    [690, "approved", 40000],
    [719, "approved", 40000],
    [720, "approved", 60000],
  ])("score %s returns %s with suggested line %s", (score, decision, line) => {
    const result = evaluatePhysicalPersonCredit({
      bureauHasHit: true,
      bureauScore: score,
      documentsComplete: true,
    });

    expect(result.publicDecision).toBe(decision);
    expect(result.suggestedCreditLine).toBe(line);
  });
});

describe("evaluateMoralPersonCredit", () => {
  it.each([
    [499, "rejected", null],
    [500, "approved", 10000],
    [549, "approved", 10000],
    [550, "approved", 20000],
    [599, "approved", 20000],
    [600, "approved", 30000],
    [649, "approved", 30000],
    [650, "approved", 40000],
    [699, "approved", 40000],
    [700, "approved", 60000],
  ])("score %s returns %s with suggested line %s", (score, decision, line) => {
    const result = evaluateMoralPersonCredit({
      bureauHasHit: true,
      bureauScore: score,
      documentsComplete: true,
    });

    expect(result.publicDecision).toBe(decision);
    expect(result.suggestedCreditLine).toBe(line);
  });
});

describe("evaluateCreditByPersonType", () => {
  it("uses physical bands for physical applications", () => {
    const result = evaluateCreditByPersonType(
      { personType: "fisica" },
      { bureauHasHit: true, bureauScore: 630, documentsComplete: true },
    );

    expect(result.publicDecision).toBe("approved");
    expect(result.suggestedCreditLine).toBe(10000);
  });

  it("uses moral bands for moral applications", () => {
    const result = evaluateCreditByPersonType(
      { personType: "moral" },
      { bureauHasHit: true, bureauScore: 630, documentsComplete: true },
    );

    expect(result.publicDecision).toBe("approved");
    expect(result.suggestedCreditLine).toBe(30000);
  });
});
