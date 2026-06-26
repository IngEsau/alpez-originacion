import type { DocumentItem, DocumentStatus } from "../../applications/types/application.types";
import type {
  CreditEvaluation,
  PublicCreditResult,
  PublicDocumentStatus,
  SolicitudDocument,
} from "../types/solicitud.types";

type DocumentLike =
  | SolicitudDocument
  | Pick<DocumentItem, "id" | "required" | "status" | "type"> & { optional?: boolean };

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

export function evaluatePhysicalPersonCredit(
  bureauHasHit: boolean,
  bureauScore: number | null,
  documentsComplete: boolean,
): CreditEvaluation {
  const evaluatedAt = new Date().toISOString();
  const documentReviewRequired = !documentsComplete;

  if (!bureauHasHit) {
    return {
      bureauHasHit: false,
      bureauScore: null,
      bureauPassed: false,
      publicDecision: "rejected",
      internalDecision: "rejected",
      suggestedCreditLine: null,
      documentsComplete,
      documentReviewRequired,
      rejectionReason: "no_credit_history",
      evaluatedAt,
    };
  }

  if (bureauScore === null || bureauScore < 630) {
    return {
      bureauHasHit: true,
      bureauScore,
      bureauPassed: false,
      publicDecision: "rejected",
      internalDecision: "rejected",
      suggestedCreditLine: null,
      documentsComplete,
      documentReviewRequired,
      rejectionReason: "score_below_minimum",
      evaluatedAt,
    };
  }

  let suggestedCreditLine = 60000;
  if (bureauScore <= 649) suggestedCreditLine = 10000;
  else if (bureauScore <= 669) suggestedCreditLine = 20000;
  else if (bureauScore <= 689) suggestedCreditLine = 30000;
  else if (bureauScore <= 719) suggestedCreditLine = 40000;
  // Business rule pending confirmation:
  // source diagram defines 690-719 and >720.
  // For the frontend demo, 720 is included in the highest range.

  return {
    bureauHasHit: true,
    bureauScore,
    bureauPassed: true,
    publicDecision: "approved",
    internalDecision: "approved_for_followup",
    suggestedCreditLine,
    documentsComplete,
    documentReviewRequired,
    rejectionReason: null,
    evaluatedAt,
  };
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
