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
  | "autorizacion"
  | "resumen"
  | "final";

export type PublicDocumentStatus = "missing" | "uploaded" | "review_pending" | "needs_change";

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
  authorizationAccepted: boolean;
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
