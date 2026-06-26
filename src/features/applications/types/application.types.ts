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
  documentsComplete: boolean;
  requiresDocumentFollowUp: boolean;
  decision: "pending" | "approved" | "rejected";
  approvedCreditLine: number | null;
  rejectionReason: "score_below_minimum" | "no_credit_history" | null;
  evaluatedAt?: string;
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
  documentsComplete?: boolean;
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
