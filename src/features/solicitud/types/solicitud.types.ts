import type { DocumentStatus, DocumentType } from "../../applications/types/application.types";

export type ApplicantKind = "physical" | "company";

export type SolicitudStep =
  | "bienvenida"
  | "tipo_solicitante"
  | "ine"
  | "revision_ine"
  | "datos_basicos"
  | "datos_negocio"
  | "monto"
  | "documentos"
  | "phone_verification"
  | "autorizacion"
  | "resumen"
  | "processing"
  | "final";

export type PublicDocumentStatus = "missing" | "uploaded" | "review_pending" | "needs_change";

export type PublicCreditResult = "approved" | "rejected";

export type DemoCreditScenario =
  | "pf-rejected-score"
  | "pm-rejected-score"
  | "no-credit-history"
  | "pf-approved"
  | "pm-approved";

export interface CreditEvaluation {
  bureauHasHit: boolean;
  bureauScore: number | null;
  bureauPassed: boolean;
  publicDecision: "approved" | "rejected";
  internalDecision: "approved_for_followup" | "rejected";
  suggestedCreditLine: number | null;
  documentsComplete: boolean;
  documentReviewRequired: boolean;
  rejectionReason: "score_below_minimum" | "no_credit_history" | null;
  evaluatedAt: string;
}

export interface StoredFile {
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
}

export interface SolicitudDocument {
  id: string;
  label: string;
  applicationType: DocumentType;
  status: PublicDocumentStatus;
  file?: StoredFile;
  optional?: boolean;
}

export interface BasicData {
  fullName: string;
  phone: string;
  email: string;
  rfc: string;
  curp: string;
  companyName: string;
  representativeName: string;
}

export interface BusinessData {
  activity: string;
  seniorityYears: string;
  monthlyIncome: string;
  annualSales: string;
}

export interface PhoneVerificationState {
  phone: string;
  maskedPhone: string;
  codeSent: boolean;
  codeVerified: boolean;
  sentAt?: string;
  verifiedAt?: string;
  attempts: number;
}

export interface SolicitudFlowState {
  flowId: string;
  trace_id: string;
  folio?: string;
  application_id?: string;
  currentStep: SolicitudStep;
  applicantKind?: ApplicantKind;
  ineFront?: StoredFile;
  ineBack?: StoredFile;
  ineReviewed: boolean;
  basicData: BasicData;
  businessData: BusinessData;
  requestedAmount?: number;
  documents: SolicitudDocument[];
  hasGuarantor?: boolean;
  hasCollateral?: boolean;
  phoneVerification: PhoneVerificationState;
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  authorizationAccepted: boolean;
  demoCreditScenario?: DemoCreditScenario;
  creditEvaluation?: CreditEvaluation;
  publicCreditResult?: PublicCreditResult;
  processingStartedAt?: string;
  publicResultDisplayedAt?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const PUBLIC_DOCUMENT_STATUS_LABELS: Record<PublicDocumentStatus, string> = {
  missing: "Falta agregar",
  uploaded: "Agregado",
  review_pending: "Por revisar",
  needs_change: "Necesita cambio",
};

export function mapPublicDocumentStatus(status: PublicDocumentStatus): DocumentStatus {
  if (status === "uploaded") return "cargado";
  if (status === "review_pending") return "en_revision";
  if (status === "needs_change") return "rechazado";
  return "pendiente";
}
