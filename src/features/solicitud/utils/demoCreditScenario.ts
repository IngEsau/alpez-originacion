import type { PersonType } from "../../applications/types/application.types";
import type { ApplicantKind, DemoCreditScenario } from "../types/solicitud.types";

const demoScenarios: Record<DemoCreditScenario, {
  bureauHasHit: boolean;
  bureauScore: number | null;
  expectedPersonType?: ApplicantKind;
}> = {
  "pf-rejected-score": {
    expectedPersonType: "physical",
    bureauHasHit: true,
    bureauScore: 610,
  },
  "pm-rejected-score": {
    expectedPersonType: "company",
    bureauHasHit: true,
    bureauScore: 480,
  },
  "no-credit-history": {
    bureauHasHit: false,
    bureauScore: null,
  },
  "pf-approved": {
    expectedPersonType: "physical",
    bureauHasHit: true,
    bureauScore: 720,
  },
  "pm-approved": {
    expectedPersonType: "company",
    bureauHasHit: true,
    bureauScore: 700,
  },
};

export function parseDemoCreditScenario(value: string | null): DemoCreditScenario | null {
  if (!value) return null;
  return value in demoScenarios ? (value as DemoCreditScenario) : null;
}

export function expectedApplicantKindForDemoScenario(scenario: DemoCreditScenario | undefined): ApplicantKind | null {
  if (!scenario) return null;
  return demoScenarios[scenario].expectedPersonType ?? null;
}

export function demoScenarioPersonTypeWarning(
  scenario: DemoCreditScenario | undefined,
  applicantKind: ApplicantKind | undefined,
): string | null {
  if (!scenario || !applicantKind) return null;
  const expected = expectedApplicantKindForDemoScenario(scenario);
  if (!expected || expected === applicantKind) return null;
  return expected === "physical"
    ? "La configuración seleccionada corresponde a Persona Física."
    : "La configuración seleccionada corresponde a Persona Moral.";
}

export function resolveDemoCreditScenario(
  scenario: DemoCreditScenario | null,
  personType: PersonType,
): {
  bureauHasHit: boolean;
  bureauScore: number | null;
} | null {
  if (!scenario) return null;
  const config = demoScenarios[scenario];
  if (!config) return null;
  if (config.expectedPersonType === "physical" && personType !== "fisica") return null;
  if (config.expectedPersonType === "company" && personType !== "moral") return null;
  return {
    bureauHasHit: config.bureauHasHit,
    bureauScore: config.bureauScore,
  };
}
