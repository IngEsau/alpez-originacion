export type PersonType = "fisica" | "moral";

export type ApplicationScenario =
  | "persona_fisica_hit_buro"
  | "persona_moral_hit_buro"
  | "persona_moral_no_hit_buro";

export type ApplicationStatus =
  | "nueva"
  | "captura_datos"
  | "validacion_ine"
  | "documentos_pendientes"
  | "documentos_revision"
  | "sms_pendiente"
  | "consulta_buro"
  | "validacion_listas"
  | "modelo_decision"
  | "analisis_credito"
  | "investigacion_legal"
  | "contratos"
  | "aprobada"
  | "rechazada";

export type ApplicationDecision = "pendiente" | "aprobada" | "rechazada" | "observada";

export type PublicDecision = "approved" | "rejected";

export type InternalApplicationStatus =
  | "evaluation_pending"
  | "rejected"
  | "approved_missing_documents"
  | "approved_document_review"
  | "approved_documents_need_changes"
  | "approved_ready_for_legal_review"
  | "legal_review"
  | "legal_review_rejected"
  | "credit_line_approved"
  | "contracts_pending"
  | "contracts_sent_for_signature"
  | "completed";

export type LegalReviewStatus = "pending" | "in_progress" | "approved" | "rejected";

export type ContractStatus = "pending" | "prepared" | "sent_for_signature" | "signed";

export type InternalNextAction =
  | "run_evaluation"
  | "close_application"
  | "request_documents"
  | "review_documents"
  | "request_document_changes"
  | "start_legal_review"
  | "approve_legal_review"
  | "reject_legal_review"
  | "confirm_credit_line"
  | "prepare_contracts"
  | "register_contract_signature"
  | "none";

export interface DocumentSummary {
  totalRequired: number;
  missing: number;
  uploaded: number;
  pendingReview: number;
  approved: number;
  needsChange: number;
  complete: boolean;
}

export interface InternalWorkflowState {
  status: InternalApplicationStatus;
  label: string;
  nextAction: InternalNextAction;
  nextActionLabel: string;
}

export type RiskLevel = "alto" | "medio" | "bajo" | "no_aplica";

export type RejectionReason =
  | "ine_vencida"
  | "ine_calidad_baja"
  | "ine_no_encontrada"
  | "rechazo_knockouts"
  | "cliente_existente"
  | "documentos_incompletos"
  | "sin_historial_crediticio"
  | "score_insuficiente"
  | "validacion_listas_rechazada"
  | "analisis_credito_rechazado"
  | "modelo_decision_rechazado"
  | "no_aplica";

export interface Address {
  street: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  neighborhood: string;
  municipality: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface PhysicalPerson {
  firstName: string;
  middleName?: string;
  lastName: string;
  secondLastName?: string;
  rfc: string;
  curp: string;
  birthDate: string;
  phone: string;
  email: string;
  personalAddress: Address;
  businessAddress: Address;
  businessActivity?: string;
  businessSeniorityYears?: number;
  averageMonthlyIncome?: number;
}

export interface MoralPerson {
  legalName: string;
  commercialName?: string;
  rfc: string;
  businessLine: string;
  constitutionDate?: string;
  companySeniorityYears?: number;
  companyAddress: Address;
  averageMonthlyIncome?: number;
  annualSales?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  annualOperatingProfit?: number;
  bankAccountSeniorityMonths?: number;
  averageBankBalance?: number;
}

export interface LegalRepresentative {
  fullName: string;
  rfc: string;
  curp: string;
  phone: string;
  email: string;
  address?: Address;
}

export interface Guarantor {
  fullName: string;
  rfc?: string;
  curp?: string;
  phone?: string;
  email?: string;
  address?: Address;
}

export type DocumentType =
  | "ine_titular"
  | "curp"
  | "constancia_situacion_fiscal"
  | "comprobante_domicilio_titular"
  | "comprobante_domicilio_negocio"
  | "comprobante_domicilio_empresa"
  | "comprobante_domicilio_representante"
  | "ine_representante_legal"
  | "opinion_positiva_sat"
  | "estados_cuenta_bancarios"
  | "declaracion_anual"
  | "estados_financieros"
  | "poder_representante_legal"
  | "acta_constitutiva"
  | "garantia"
  | "ine_aval"
  | "comprobante_domicilio_aval";

export type DocumentStatus = "pendiente" | "cargado" | "en_revision" | "validado" | "rechazado";

export interface DocumentItem {
  id: string;
  applicationId: string;
  type: DocumentType;
  label: string;
  required: boolean;
  status: DocumentStatus;
  fileName?: string;
  fileSizeMb?: number;
  fileType?: "pdf" | "jpg" | "jpeg" | "png";
  uploadedAt?: string;
  reviewedAt?: string;
  comments?: string;
}

export type ValidationType =
  | "ine"
  | "knockouts"
  | "cliente_existente"
  | "sms"
  | "buro"
  | "listas"
  | "documentos"
  | "modelo_decision"
  | "investigacion_legal"
  | "contratos";

export type ValidationStatus = "pendiente" | "procesando" | "aprobado" | "rechazado" | "observado";

export interface ValidationItem {
  id: string;
  applicationId: string;
  type: ValidationType;
  label: string;
  status: ValidationStatus;
  result?: string;
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface IneValidationResult {
  imageQuality: "ok" | "low_quality";
  isExpired: boolean;
  existsInRegistry: boolean;
  status: ValidationStatus;
  message: string;
}

export interface KnockoutResult {
  passed: boolean;
  reasons: string[];
}

export interface ExistingClientResult {
  exists: boolean;
  customerId?: string;
  message: string;
}

export interface BureauResult {
  hasHit: boolean;
  score: number | null;
  status: ValidationStatus;
  message: string;
}

export interface ListsValidationResult {
  blacklists: boolean;
  curp: boolean;
  sat: boolean;
  judicialRecords: boolean;
  publicCommerceRegistry: boolean;
  satSanctions: boolean;
  status: ValidationStatus;
  message: string;
}

export interface CreditDecision {
  applicationId: string;
  decision: ApplicationDecision;
  status: ApplicationStatus;
  requestedAmount: number;
  assignedCreditLine: number | null;
  bureauScore: number | null;
  finalScore: number | null;
  riskLevel: RiskLevel;
  rejectionReason?: RejectionReason;
  message: string;
  evaluatedAt: string;
}

export interface CreditEvaluation {
  bureauHasHit: boolean;
  bureauScore: number | null;
  bureauPassed: boolean;
  publicDecision: PublicDecision;
  internalDecision: "approved_for_followup" | "rejected";
  suggestedCreditLine: number | null;
  documentsComplete: boolean;
  documentReviewRequired: boolean;
  rejectionReason: "score_below_minimum" | "no_credit_history" | null;
  evaluatedAt: string;
}

export type ValidationEventName =
  | "ine_uploaded"
  | "ine_validation_completed"
  | "knockouts_completed"
  | "existing_client_validation_completed"
  | "otp_verified"
  | "lists_validation_completed"
  | "bureau_query_completed"
  | "decision_model_completed";

export interface ValidationEvent {
  name: ValidationEventName;
  completedAt: string;
  source: "public_onboarding" | "agent_panel" | "backfill";
  detail?: string;
}

export interface ValidationSummaryItem {
  type: ValidationType;
  label: string;
  status: "pending" | "completed" | "rejected" | "observed";
  detail: string;
  completedAt?: string;
  source?: "public_onboarding" | "agent_panel" | "backfill";
}

export type NotificationTemplate =
  | "application_received"
  | "documents_requested"
  | "approved_for_followup"
  | "final_credit_line_approved"
  | "contracts_ready"
  | "application_completed";

export interface NotificationRequest {
  type: "email" | "sms";
  template: NotificationTemplate;
  recipient: string;
  applicationId: string;
  variables: Record<string, string | number>;
}

export interface TimelineEvent {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  title: string;
  description?: string;
  actor: string;
  createdAt: string;
}

export interface Application {
  id: string;
  folio: string;
  trace_id: string;
  personType: PersonType;
  scenario: ApplicationScenario;
  status: ApplicationStatus;
  decision: ApplicationDecision;
  rejectionReason?: RejectionReason;
  applicantName: string;
  applicantRfc?: string;
  applicantCurp?: string;
  requestedAmount: number;
  assignedCreditLine: number | null;
  finalApprovedCreditLine?: number | null;
  bureauScore: number | null;
  finalScore: number | null;
  riskLevel: RiskLevel;
  executiveName: string;
  physicalPerson?: PhysicalPerson;
  moralPerson?: MoralPerson;
  legalRepresentative?: LegalRepresentative;
  guarantor?: Guarantor;
  documents: DocumentItem[];
  validations: ValidationItem[];
  decisionResult?: CreditDecision;
  creditEvaluation?: CreditEvaluation;
  demoCreditScenario?: string;
  validationEvents?: ValidationEvent[];
  notificationRequests?: NotificationRequest[];
  documentsComplete?: boolean;
  documentSummary?: DocumentSummary;
  internalWorkflowStatus?: InternalApplicationStatus;
  internalNextAction?: InternalNextAction;
  legalReviewStatus?: LegalReviewStatus;
  contractStatus?: ContractStatus;
  documentReviewRequired?: boolean;
  requiresDocumentFollowUp?: boolean;
  otpVerified?: boolean;
  otpVerifiedAt?: string;
  bureauHasHit?: boolean;
  followUpAction?: string;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: "ejecutivo" | "analista" | "admin_demo";
}

export interface DashboardSummary {
  totalApplications: number;
  newApplications: number;
  inValidation: number;
  pendingDocuments: number;
  approved: number;
  rejected: number;
  runningApplications: number;
  totalTraces: number;
  runningTraces: number;
  failedTraces: number;
  totalRequestedAmount: number;
  totalAssignedCreditLine: number;
  byStatus: Array<{ status: ApplicationStatus; count: number }>;
  byScenario: Array<{ scenario: ApplicationScenario; count: number }>;
  recentApplications: Application[];
}

export interface ApplicationFilters {
  search?: string;
  status?: ApplicationStatus | "todos";
  personType?: PersonType | "todos";
  decision?: ApplicationDecision | "todas";
  scenario?: ApplicationScenario | "todos";
}

export interface CreateApplicationPayload {
  trace_id?: string;
  personType: PersonType;
  scenario: ApplicationScenario;
  requestedAmount: number;
  executiveName: string;
  physicalPerson?: PhysicalPerson;
  moralPerson?: MoralPerson;
  legalRepresentative?: LegalRepresentative;
  guarantor?: Guarantor;
  initialDocumentStatuses?: Record<string, DocumentStatus>;
}
