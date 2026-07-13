import type {
  Application,
  CreditDecision,
  DocumentItem,
  RejectionReason,
  RiskLevel,
  ValidationType,
} from "../../applications/types/application.types";

function baseDecision(application: Application): Omit<CreditDecision, "decision" | "status" | "message"> {
  return {
    applicationId: application.id,
    requestedAmount: application.requestedAmount,
    assignedCreditLine: application.assignedCreditLine,
    bureauScore: application.bureauScore,
    finalScore: application.finalScore,
    riskLevel: application.riskLevel,
    rejectionReason: application.rejectionReason,
    evaluatedAt: new Date().toISOString(),
  };
}

function rejected(
  application: Application,
  rejectionReason: RejectionReason,
  message: string,
): CreditDecision {
  return {
    ...baseDecision(application),
    decision: "rechazada",
    status: "rechazada",
    assignedCreditLine: null,
    riskLevel: "no_aplica",
    rejectionReason,
    message,
  };
}

function observed(application: Application, message: string): CreditDecision {
  return {
    ...baseDecision(application),
    decision: "observada",
    status: "documentos_pendientes",
    assignedCreditLine: null,
    riskLevel: "no_aplica",
    rejectionReason: "documentos_incompletos",
    message,
  };
}

function approved(
  application: Application,
  assignedCreditLine: number,
  riskLevel: RiskLevel,
  message: string,
  scores?: Pick<CreditDecision, "bureauScore" | "finalScore">,
): CreditDecision {
  return {
    ...baseDecision(application),
    decision: "aprobada",
    status: "investigacion_legal",
    assignedCreditLine,
    bureauScore: scores?.bureauScore ?? application.bureauScore,
    finalScore: scores?.finalScore ?? application.finalScore,
    riskLevel,
    rejectionReason: undefined,
    message,
  };
}

function getValidation(application: Application, type: ValidationType) {
  return application.validations.find((validation) => validation.type === type);
}

function hasPendingRequiredDocuments(documents: DocumentItem[]): boolean {
  return documents.some((document) => document.required && document.status === "pendiente");
}

function hasRejectedDocuments(documents: DocumentItem[]): boolean {
  return documents.some((document) => document.required && document.status === "rechazado");
}

function evaluateGlobalRules(application: Application): CreditDecision | null {
  const ine = getValidation(application, "ine");
  const knockouts = getValidation(application, "knockouts");
  const existingClient = getValidation(application, "cliente_existente");
  const lists = getValidation(application, "listas");

  if (ine?.status === "rechazado") {
    const detail = `${ine.result ?? ""} ${ine.detail ?? ""}`.toLowerCase();
    const reason = detail.includes("padrón") || detail.includes("padron")
      ? "ine_no_encontrada"
      : detail.includes("calidad")
        ? "ine_calidad_baja"
        : "ine_vencida";
    return rejected(application, reason, "Solicitud rechazada por validación de INE.");
  }

  if (knockouts?.status === "rechazado") {
    return rejected(application, "rechazo_knockouts", "Solicitud rechazada por reglas knockout.");
  }

  if (existingClient?.status === "rechazado") {
    return rejected(application, "cliente_existente", "Solicitud rechazada por cliente existente.");
  }

  if (lists?.status === "rechazado") {
    return rejected(application, "validacion_listas_rechazada", "Solicitud rechazada por validación de listas.");
  }

  if (hasPendingRequiredDocuments(application.documents) || hasRejectedDocuments(application.documents)) {
    return observed(application, "Solicitud observada por documentos pendientes.");
  }

  return null;
}

export function evaluatePhysicalPersonHitBuro(application: Application): CreditDecision {
  const globalResult = evaluateGlobalRules(application);
  if (globalResult) return globalResult;

  const score = application.bureauScore;
  if (score === null || score < 630) {
    return rejected(application, "score_insuficiente", "Solicitud rechazada por score menor al mínimo requerido.");
  }

  if (score <= 649) {
    return approved(application, 10000, "alto", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
  }
  if (score <= 669) {
    return approved(application, 20000, "medio", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
  }
  if (score <= 689) {
    return approved(application, 30000, "medio", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
  }
  if (score <= 719) {
    return approved(application, 40000, "bajo", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
  }

  return approved(application, 60000, "bajo", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
}

export function evaluateMoralPersonHitBuro(application: Application): CreditDecision {
  const globalResult = evaluateGlobalRules(application);
  if (globalResult) return globalResult;

  const score = application.bureauScore;
  if (score === null || score <= 499) {
    return rejected(application, "score_insuficiente", "Solicitud rechazada por score menor al mínimo requerido para Persona Moral.");
  }

  if (score <= 549) {
    return approved(application, 10000, "alto", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
  }
  if (score <= 599) {
    return approved(application, 20000, "medio", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
  }
  if (score <= 649) {
    return approved(application, 30000, "medio", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
  }
  if (score <= 699) {
    return approved(application, 40000, "bajo", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
  }

  return approved(application, 60000, "bajo", "Solicitud aprobada en modelo de decisión. Continúa investigación legal.");
}

function scoreByAmount(value: number | undefined, requestedAmount: number): number {
  const safeValue = value ?? 0;
  if (safeValue >= requestedAmount * 0.5) return 100;
  if (safeValue >= requestedAmount * 0.3) return 75;
  if (safeValue >= requestedAmount * 0.15) return 50;
  return 30;
}

function calculateNoHitFinalScore(application: Application): number {
  const moralPerson = application.moralPerson;
  const missingDocuments = application.documents.filter(
    (document) => document.required && document.status === "pendiente",
  ).length;
  const documentScore = missingDocuments === 0 ? 100 : missingDocuments === 1 ? 70 : 40;
  const incomeScore = scoreByAmount(moralPerson?.averageMonthlyIncome, application.requestedAmount);
  const bankBalanceScore = scoreByAmount(moralPerson?.averageBankBalance, application.requestedAmount);
  const seniorityYears = moralPerson?.companySeniorityYears ?? 0;
  const seniorityScore = seniorityYears >= 5 ? 100 : seniorityYears >= 3 ? 80 : seniorityYears >= 1 ? 60 : 30;
  const totalAssets = moralPerson?.totalAssets ?? 0;
  const totalLiabilities = moralPerson?.totalLiabilities ?? 0;
  const solvencyScore =
    totalAssets > totalLiabilities * 2
      ? 100
      : totalAssets > totalLiabilities * 1.5
        ? 75
        : totalAssets > totalLiabilities
          ? 50
          : 30;

  return Math.round(
    documentScore * 0.3 +
      incomeScore * 0.25 +
      bankBalanceScore * 0.2 +
      seniorityScore * 0.15 +
      solvencyScore * 0.1,
  );
}

export function evaluateMoralPersonNoHitBuro(application: Application): CreditDecision {
  const globalResult = evaluateGlobalRules(application);
  if (globalResult) return globalResult;

  const finalScore = application.finalScore ?? calculateNoHitFinalScore(application);
  if (finalScore < 65) {
    return {
      ...rejected(application, "modelo_decision_rechazado", "Solicitud rechazada por el modelo de decisión."),
      finalScore,
      bureauScore: null,
    };
  }

  if (finalScore <= 74) {
    return approved(application, 10000, "alto", "Solicitud aprobada por modelo alternativo sin hit Buró.", {
      bureauScore: null,
      finalScore,
    });
  }
  if (finalScore <= 84) {
    return approved(application, 20000, "medio", "Solicitud aprobada por modelo alternativo sin hit Buró.", {
      bureauScore: null,
      finalScore,
    });
  }
  if (finalScore <= 94) {
    return approved(application, 40000, "bajo", "Solicitud aprobada por modelo alternativo sin hit Buró.", {
      bureauScore: null,
      finalScore,
    });
  }

  return approved(application, 60000, "bajo", "Solicitud aprobada por modelo alternativo sin hit Buró.", {
    bureauScore: null,
    finalScore,
  });
}

export function runDecisionRules(application: Application): CreditDecision {
  if (application.scenario === "persona_fisica_hit_buro") {
    return evaluatePhysicalPersonHitBuro(application);
  }

  if (application.scenario === "persona_moral_hit_buro") {
    return evaluateMoralPersonHitBuro(application);
  }

  return evaluateMoralPersonNoHitBuro(application);
}
