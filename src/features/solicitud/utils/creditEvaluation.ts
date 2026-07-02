import type { Application, DocumentItem, DocumentStatus, PersonType } from "../../applications/types/application.types";
import type {
  CreditEvaluation,
  PublicCreditResult,
  PublicDocumentStatus,
  SolicitudDocument,
} from "../types/solicitud.types";

type DocumentLike =
  | SolicitudDocument
  | Pick<DocumentItem, "id" | "required" | "status" | "type"> & { optional?: boolean };

export interface CreditEvaluationInput {
  bureauHasHit: boolean;
  bureauScore: number | null;
  documentsComplete: boolean;
}

const completeStatuses = new Set<PublicDocumentStatus | DocumentStatus | "approved">([
  "uploaded",
  "review_pending",
  "approved",
  "cargado",
  "en_revision",
  "validado",
]);

function isGuarantorDocument(document: DocumentLike): boolean {
  return document.id === "ine_aval" || document.id === "comprobante_domicilio_aval";
}

function isCollateralDocument(document: DocumentLike): boolean {
  return document.id === "garantia";
}

function isIneDocument(document: DocumentLike): boolean {
  return document.id === "ine_titular" || document.id === "ine_representante_legal";
}

export function areRequiredDocumentsComplete(
  documents: DocumentLike[],
  options: { hasGuarantor?: boolean; hasCollateral?: boolean; ineLoaded?: boolean } = {},
): boolean {
  return documents.every((document) => {
    if (isGuarantorDocument(document) && !options.hasGuarantor) return true;
    if (isCollateralDocument(document) && !options.hasCollateral) return true;
    if (isIneDocument(document) && options.ineLoaded) return true;
    if ("required" in document && document.required === false) return true;
    if ("optional" in document && document.optional && !isGuarantorDocument(document) && !isCollateralDocument(document)) {
      return true;
    }
    return completeStatuses.has(document.status);
  });
}

function buildRejectedEvaluation(
  bureauHasHit: boolean,
  bureauScore: number | null,
  documentsComplete: boolean,
  rejectionReason: "score_below_minimum" | "no_credit_history",
): CreditEvaluation {
  const evaluatedAt = new Date().toISOString();
  return {
    bureauHasHit,
    bureauScore: bureauHasHit ? bureauScore : null,
    bureauPassed: false,
    publicDecision: "rejected",
    internalDecision: "rejected",
    suggestedCreditLine: null,
    documentsComplete,
    documentReviewRequired: !documentsComplete,
    rejectionReason,
    evaluatedAt,
  };
}

function buildApprovedEvaluation(
  bureauScore: number,
  documentsComplete: boolean,
  suggestedCreditLine: number,
): CreditEvaluation {
  return {
    bureauHasHit: true,
    bureauScore,
    bureauPassed: true,
    publicDecision: "approved",
    internalDecision: "approved_for_followup",
    suggestedCreditLine,
    documentsComplete,
    documentReviewRequired: !documentsComplete,
    rejectionReason: null,
    evaluatedAt: new Date().toISOString(),
  };
}

function normalizeInput(
  inputOrHit: CreditEvaluationInput | boolean,
  bureauScore?: number | null,
  documentsComplete?: boolean,
): CreditEvaluationInput {
  if (typeof inputOrHit === "object") return inputOrHit;
  return {
    bureauHasHit: inputOrHit,
    bureauScore: bureauScore ?? null,
    documentsComplete: Boolean(documentsComplete),
  };
}

export function evaluatePhysicalPersonCredit(input: CreditEvaluationInput): CreditEvaluation;
export function evaluatePhysicalPersonCredit(
  bureauHasHit: boolean,
  bureauScore: number | null,
  documentsComplete: boolean,
): CreditEvaluation;
export function evaluatePhysicalPersonCredit(
  inputOrHit: CreditEvaluationInput | boolean,
  bureauScore?: number | null,
  documentsComplete?: boolean,
): CreditEvaluation {
  const input = normalizeInput(inputOrHit, bureauScore, documentsComplete);

  if (!input.bureauHasHit) {
    return buildRejectedEvaluation(false, null, input.documentsComplete, "no_credit_history");
  }

  if (input.bureauScore === null || input.bureauScore < 630) {
    return buildRejectedEvaluation(true, input.bureauScore, input.documentsComplete, "score_below_minimum");
  }

  let suggestedCreditLine = 60000;
  if (input.bureauScore <= 649) suggestedCreditLine = 10000;
  else if (input.bureauScore <= 669) suggestedCreditLine = 20000;
  else if (input.bureauScore <= 689) suggestedCreditLine = 30000;
  else if (input.bureauScore <= 719) suggestedCreditLine = 40000;
  // Business rule pending confirmation:
  // source diagram defines 690-719 and >720.
  // For the frontend demo, 720 is included in the highest range.

  return buildApprovedEvaluation(input.bureauScore, input.documentsComplete, suggestedCreditLine);
}

export function evaluateMoralPersonCredit(input: CreditEvaluationInput): CreditEvaluation {
  if (!input.bureauHasHit) {
    return buildRejectedEvaluation(false, null, input.documentsComplete, "no_credit_history");
  }

  if (input.bureauScore === null || input.bureauScore <= 499) {
    return buildRejectedEvaluation(true, input.bureauScore, input.documentsComplete, "score_below_minimum");
  }

  let suggestedCreditLine = 60000;
  if (input.bureauScore <= 549) suggestedCreditLine = 10000;
  else if (input.bureauScore <= 599) suggestedCreditLine = 20000;
  else if (input.bureauScore <= 649) suggestedCreditLine = 30000;
  else if (input.bureauScore <= 699) suggestedCreditLine = 40000;

  return buildApprovedEvaluation(input.bureauScore, input.documentsComplete, suggestedCreditLine);
}

export function evaluateCreditByPersonType(
  application: Pick<Application, "personType"> | { personType: PersonType },
  input: CreditEvaluationInput,
): CreditEvaluation {
  if (application.personType === "fisica") {
    return evaluatePhysicalPersonCredit(input);
  }

  return evaluateMoralPersonCredit(input);
}

export function getPublicCreditResult(evaluation: CreditEvaluation): PublicCreditResult {
  return evaluation.publicDecision;
}

export function scoreRangeLabel(score: number | null): string {
  if (score === null) return "Sin historial";
  if (score < 630) return "Debajo de mínimo";
  if (score <= 649) return "Riesgo alto";
  if (score <= 689) return "Riesgo medio";
  return "Riesgo bajo";
}
