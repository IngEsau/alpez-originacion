import type {
  Address,
  Application,
  CreateApplicationPayload,
  CreditDecision,
  NotificationRequest,
  DocumentStatus,
  PersonType,
  RejectionReason,
  RiskLevel,
  ValidationEvent,
} from "../../applications/types/application.types";
import { createApplication, getApplicationById, updateApplication } from "../../applications/services/applicationMockService";
import { calculateDocumentSummary, deriveInternalWorkflowState } from "../../applications/utils/workflowState";
import { addTraceEvent, createTrace, linkTraceApplication } from "../../traces/services/traceService";
import type {
  ApplicantKind,
  BasicData,
  BusinessData,
  CreditEvaluation,
  DemoCreditScenario,
  FiscalIdentity,
  OnboardingGeneralData,
  PhoneVerificationState,
  PublicCreditResult,
  SolicitudCorrectionIssue,
  SolicitudDocument,
  SolicitudFlowState,
  SolicitudStep,
  StoredFile,
} from "../types/solicitud.types";
import { mapPublicDocumentStatus } from "../types/solicitud.types";
import {
  loadRequiredDocuments,
  consultOnboardingBureau,
  OnboardingOperationError,
  saveOnboardingBusinessData,
  saveOnboardingGeneralData,
  sendOnboardingSms,
  startOnboardingFlow,
  uploadDocument,
  USE_REAL_API,
  validateFiscalIdentityWithBackend,
  validateOnboardingSms,
} from "../../onboarding/services/onboardingService";
import { ApiRequestError } from "../../../services/http/httpClient";
import { scoreRangeLabel } from "../utils/creditEvaluation";
import { resolveDemoCreditScenario } from "../utils/demoCreditScenario";
import type { ConsultBureauResult, StartOnboardingResult } from "../../../services/api/onboarding.types";
import {
  basicDataFromGeneralData,
  EMPTY_FISCAL_IDENTITY,
  EMPTY_ONBOARDING_GENERAL_DATA,
  fiscalIdentityFromBasicData,
  generalDataFromBasicData,
  mapGeneralDataToBackendPayload,
  normalizeGeneralDataInput,
  normalizeFiscalIdentity,
  resolveFiscalIdentityAfterGeneralData,
  validateFiscalIdentity,
  validateFiscalIdentityConsistency,
  validateGeneralData,
} from "../utils/generalData";
import { applyIneOcrToGeneralData, extractFiscalIdentityFromOcr, fiscalIdentityFromOcr } from "../utils/ineOcr";
import { optimizeImageDataUrl } from "../../../shared/lib/fileToBase64";

const STORAGE_KEY = "alpez_public_solicitud_flows";
export const SOLICITUD_RECOVERY_TTL_MS = 48 * 60 * 60 * 1000;
export const INE_AUTO_CONTINUE_TIMEOUT_MS = 7_000;

export class SolicitudCorrectionError extends Error {
  issues: SolicitudCorrectionIssue[];

  constructor(message: string, issues: SolicitudCorrectionIssue[]) {
    super(message);
    this.name = "SolicitudCorrectionError";
    this.issues = issues;
  }
}

export class SolicitudStorageError extends Error {
  constructor() {
    super("No pudimos guardar este archivo en el dispositivo. Intenta con una imagen más ligera o vuelve a tomar la foto.");
    this.name = "SolicitudStorageError";
  }
}

const GENERAL_FIELD_LABELS: Partial<Record<keyof OnboardingGeneralData, string>> = {
  primerNombre: "primer nombre",
  apellidoPaterno: "apellido paterno",
  fechaNacimiento: "fecha de nacimiento",
  genero: "género",
  telefono: "celular",
  correo: "correo electrónico",
  estadoNacimientoId: "estado de nacimiento",
  direccion: "calle",
  numExt: "número exterior",
  codigoPostal: "código postal",
  estadoId: "estado del domicilio",
  municipioId: "municipio",
  coloniaId: "colonia",
};

function generalDataCorrectionIssues(flow: SolicitudFlowState): SolicitudCorrectionIssue[] {
  return Object.entries(validateGeneralData(flow.generalData)).map(([field, message]) => ({
    field,
    label: GENERAL_FIELD_LABELS[field as keyof OnboardingGeneralData] ?? "dato personal",
    message,
    step: "datos_basicos" as const,
  }));
}

function fiscalIdentityCorrectionIssues(flow: SolicitudFlowState): SolicitudCorrectionIssue[] {
  const errors = {
    ...validateFiscalIdentity(flow.fiscalIdentity),
    ...validateFiscalIdentityConsistency(flow.fiscalIdentity, flow.generalData),
  };
  return Object.entries(errors).map(([field, message]) => ({
    field,
    label: field === "rfc" ? "RFC" : field === "curp" ? "CURP" : "estado de nacimiento",
    message,
    step: field === "curp" ? "ine" as const : field === "estadoNacimientoId" ? "datos_basicos" as const : "fiscal_identity" as const,
  }));
}

function validateFlowBeforeSubmission(flow: SolicitudFlowState): void {
  const issues = [...generalDataCorrectionIssues(flow), ...fiscalIdentityCorrectionIssues(flow)];
  if (!flow.phoneVerified) {
    issues.push({
      field: "telefono",
      label: "verificación de celular",
      message: "Confirma tu celular con el código que recibiste.",
      step: "phone_verification",
    });
  }
  if (issues.length > 0) {
    throw new SolicitudCorrectionError("Encontramos información que necesitas corregir antes de enviar tu solicitud.", issues);
  }
}

function finalCorrectionError(error: unknown): SolicitudCorrectionError | null {
  const originalError = error instanceof OnboardingOperationError ? error.originalError : error;
  const body = originalError instanceof ApiRequestError ? originalError.body : originalError;
  let searchable = "";
  try {
    searchable = JSON.stringify(body ?? error).toLocaleLowerCase("es-MX");
  } catch {
    searchable = error instanceof Error ? error.message.toLocaleLowerCase("es-MX") : "";
  }

  const issues: SolicitudCorrectionIssue[] = [];
  if (searchable.includes("curp")) {
    issues.push({
      field: "curp",
      label: "CURP",
      message: "La CURP no coincide con la información de tu identificación. Vuelve a cargarla para corregirla.",
      step: "ine",
    });
  }
  if (searchable.includes("rfc")) {
    issues.push({
      field: "rfc",
      label: "RFC",
      message: "El RFC no coincide con tus datos personales. Revísalo antes de continuar.",
      step: "fiscal_identity",
    });
  }
  if (searchable.includes("estado_nacimiento") || searchable.includes("estado de nacimiento")) {
    issues.push({
      field: "estadoNacimientoId",
      label: "estado de nacimiento",
      message: "El estado de nacimiento no coincide con tu identificación.",
      step: "datos_basicos",
    });
  }
  if (searchable.includes("fecha_nacimiento") || searchable.includes("fecha de nacimiento")) {
    issues.push({
      field: "fechaNacimiento",
      label: "fecha de nacimiento",
      message: "La fecha de nacimiento no coincide con tu identificación.",
      step: "datos_basicos",
    });
  }
  if (searchable.includes("telefono") || searchable.includes("celular")) {
    issues.push({
      field: "telefono",
      label: "celular",
      message: "Revisa el número celular y vuelve a verificarlo.",
      step: "datos_basicos",
    });
  }

  if (issues.length === 0 && (searchable.includes("datos") || searchable.includes("informaci"))) {
    issues.push({
      field: "generalData",
      label: "datos personales",
      message: "Revisa que tus datos personales coincidan con tu identificación.",
      step: "datos_basicos",
    });
  }

  return issues.length > 0
    ? new SolicitudCorrectionError("Tus datos capturados necesitan una corrección.", issues)
    : null;
}

function backendTraceIdOrThrow(flow: SolicitudFlowState): string {
  const traceId = flow.backendTraceId || flow.trace_id;
  if (!traceId && USE_REAL_API) {
    throw new Error("No pudimos guardar este paso. Intenta nuevamente.");
  }
  return traceId;
}

function createValidationEvents(flow: SolicitudFlowState, evaluatedAt: string): ValidationEvent[] {
  const source = "public_onboarding" as const;
  return [
    { name: "ine_uploaded", completedAt: flow.createdAt, source, detail: "INE cargada en canal autoasistido." },
    { name: "ine_validation_completed", completedAt: flow.createdAt, source, detail: "Revisión inicial de INE completada." },
    { name: "knockouts_completed", completedAt: flow.createdAt, source, detail: "Validaciones iniciales completadas." },
    { name: "existing_client_validation_completed", completedAt: flow.createdAt, source, detail: "Cliente existente validado." },
    { name: "otp_verified", completedAt: flow.phoneVerifiedAt ?? evaluatedAt, source, detail: "OTP verificado." },
    { name: "lists_validation_completed", completedAt: evaluatedAt, source, detail: "Validación de listas completada." },
    { name: "bureau_query_completed", completedAt: evaluatedAt, source, detail: "Consulta de historial completada." },
    { name: "decision_model_completed", completedAt: evaluatedAt, source, detail: "Evaluación de crédito completada." },
  ];
}

function notificationRecipient(flow: SolicitudFlowState, type: "email" | "sms"): string {
  if (type === "email") return flow.basicData.email || "contacto@alpez.mx";
  return flow.basicData.phone || "2220000000";
}

function createNotificationRequest(
  flow: SolicitudFlowState,
  applicationId: string,
  template: NotificationRequest["template"],
  type: NotificationRequest["type"] = "email",
  variables: Record<string, string | number> = {},
): NotificationRequest {
  return {
    type,
    template,
    recipient: notificationRecipient(flow, type),
    applicationId,
    variables: {
      folio: flow.folio ?? "Pendiente",
      applicantName: flow.basicData.fullName || flow.basicData.companyName || "Prospecto",
      ...variables,
    },
  };
}

const EMPTY_BASIC_DATA: BasicData = {
  fullName: "",
  phone: "",
  email: "",
  rfc: "",
  curp: "",
  companyName: "",
  representativeName: "",
};

const EMPTY_BUSINESS_DATA: BusinessData = {
  activity: "",
  seniorityYears: "",
  monthlyIncome: "",
  annualSales: "",
};

const DEFAULT_ADDRESS: Address = {
  street: "Domicilio capturado",
  exteriorNumber: "S/N",
  neighborhood: "Centro",
  municipality: "Puebla",
  state: "Puebla",
  zipCode: "72000",
  country: "México",
};

function wait(ms = 250): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readStore(): SolicitudFlowState[] {
  if (!canUseLocalStorage()) return [];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];

  let storedFlows: SolicitudFlowState[];
  try {
    storedFlows = JSON.parse(saved) as SolicitudFlowState[];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }

  const now = Date.now();
  const activeFlows = storedFlows.filter((flow) => {
    const fallbackExpiration = new Date(flow.updatedAt || flow.createdAt).getTime() + SOLICITUD_RECOVERY_TTL_MS;
    const expiration = flow.expiresAt ? new Date(flow.expiresAt).getTime() : fallbackExpiration;
    return Number.isFinite(expiration) && expiration > now;
  });
  if (activeFlows.length !== storedFlows.length) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(activeFlows));
    } catch {
      // The valid in-memory result is still usable even if browser cleanup cannot be persisted.
    }
  }
  return activeFlows;
}

function storedFileWithoutPayload(file?: StoredFile): StoredFile | undefined {
  if (!file) return undefined;
  const { previewUrl: _previewUrl, ...metadata } = file;
  return metadata;
}

async function optimizeStoredImage(file?: StoredFile): Promise<StoredFile | undefined> {
  if (!file?.previewUrl || !file.type.startsWith("image/")) return file;
  return {
    ...file,
    previewUrl: await optimizeImageDataUrl(file.previewUrl, file.name, file.type),
  };
}

function compactArchivedFlow(flow: SolicitudFlowState): SolicitudFlowState {
  const hasStartedOnBackend = Boolean(flow.backendTraceId);
  return {
    ...flow,
    ineFront: hasStartedOnBackend ? storedFileWithoutPayload(flow.ineFront) : undefined,
    ineBack: hasStartedOnBackend ? storedFileWithoutPayload(flow.ineBack) : undefined,
    ineReviewed: hasStartedOnBackend ? flow.ineReviewed : false,
    ineProcessingStatus: hasStartedOnBackend ? flow.ineProcessingStatus : "idle",
    ineProcessingRequestId: hasStartedOnBackend ? flow.ineProcessingRequestId : undefined,
    ineProcessingStartedAt: hasStartedOnBackend ? flow.ineProcessingStartedAt : undefined,
    ineProcessingMessage: hasStartedOnBackend ? flow.ineProcessingMessage : undefined,
    currentStep: hasStartedOnBackend || flow.currentStep === "tipo_solicitante" ? flow.currentStep : "ine",
    documents: flow.documents.map((document) => ({
      ...document,
      file: storedFileWithoutPayload(document.file),
    })),
  };
}

function isStorageQuotaError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED";
  }
  return error instanceof Error && /quota|storage/i.test(error.message);
}

function writeStore(flows: SolicitudFlowState[]): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
    return;
  } catch (error) {
    if (!isStorageQuotaError(error)) throw new SolicitudStorageError();
  }

  const [currentFlow, ...archivedFlows] = flows;
  const compactedFlows = currentFlow
    ? [currentFlow, ...archivedFlows.map(compactArchivedFlow)]
    : [];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(compactedFlows));
  } catch {
    throw new SolicitudStorageError();
  }
}

function saveFlow(flow: SolicitudFlowState): SolicitudFlowState {
  const flows = readStore();
  const exists = flows.some((item) => item.flowId === flow.flowId);
  const now = new Date();
  const nextFlow = {
    ...flow,
    recoveryFolio: flow.recoveryFolio || createRecoveryFolio(),
    expiresAt: new Date(now.getTime() + SOLICITUD_RECOVERY_TTL_MS).toISOString(),
    updatedAt: now.toISOString(),
  };
  const otherFlows = exists
    ? flows.filter((item) => item.flowId !== flow.flowId)
    : flows;
  writeStore([nextFlow, ...otherFlows]);
  return structuredClone(nextFlow);
}

function createFlowId(): string {
  return `SOL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function createRecoveryFolio(): string {
  const date = new Date();
  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase().padEnd(6, "0");
  return `ALP-${datePart}-${randomPart}`;
}

function normalizeRecoveryFolio(value: string): string {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function personTypeFromKind(kind?: ApplicantKind): PersonType {
  return kind === "company" ? "moral" : "fisica";
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function maskPhone(phone: string): string {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return "";
  return `*** *** ${digits.slice(-4)}`;
}

function phoneVerificationForPhone(phone: string, current?: PhoneVerificationState): PhoneVerificationState {
  const digits = digitsOnly(phone);
  const maskedPhone = maskPhone(digits);
  if (current?.phone === digits) return { ...current, maskedPhone };

  return {
    phone: digits,
    maskedPhone,
    codeSent: false,
    codeVerified: false,
    attempts: 0,
  };
}

function traceStepForPublicStep(step: SolicitudStep) {
  if (step === "ine") return "ine_carga";
  if (step === "revision_ine") return "ine_validacion_calidad";
  if (step === "documentos") return "documentos";
  if (step === "phone_verification") return "sms";
  if (step === "final") return "finalizado";
  if (step === "bienvenida" || step === "tipo_solicitante") return "originacion_iniciada";
  return "captura_datos";
}

function riskFromScore(score: number | null): RiskLevel {
  const label = scoreRangeLabel(score);
  if (label === "Riesgo alto") return "alto";
  if (label === "Riesgo medio") return "medio";
  if (label === "Riesgo bajo") return "bajo";
  return "no_aplica";
}

function rejectionReasonFromEvaluation(reason: "score_below_minimum" | "no_credit_history" | null): RejectionReason | undefined {
  if (reason === "no_credit_history") return "sin_historial_crediticio";
  if (reason === "score_below_minimum") return "score_insuficiente";
  return undefined;
}

function isDemoBureauInputApproved(
  input: { bureauHasHit: boolean; bureauScore: number | null },
  personType: PersonType,
): boolean {
  if (!input.bureauHasHit || input.bureauScore === null) return false;
  return personType === "fisica" ? input.bureauScore >= 630 : input.bureauScore >= 500;
}

function fallbackBureauResultForFlow(flow: SolicitudFlowState): ConsultBureauResult {
  const personType = personTypeFromKind(flow.applicantKind);
  const demoInput = resolveDemoCreditScenario(flow.demoCreditScenario ?? null, personType);

  if (demoInput) {
    return {
      aprobadoPreliminar: isDemoBureauInputApproved(demoInput, personType),
      score: demoInput.bureauScore ?? undefined,
      folio: flow.folio,
      estatusSeguimiento: isDemoBureauInputApproved(demoInput, personType) ? "EN_REVISION" : "RECHAZADA",
      mensaje: isDemoBureauInputApproved(demoInput, personType) ? "Solicitud recibida." : "Solicitud rechazada.",
    };
  }

  return {
    aprobadoPreliminar: true,
    score: personType === "fisica" ? 720 : 700,
    folio: flow.folio,
    estatusSeguimiento: "EN_REVISION",
    mensaje: "Solicitud recibida.",
  };
}

function creditEvaluationFromBureauResult(result: ConsultBureauResult): CreditEvaluation {
  const approved = result.aprobadoPreliminar;
  const score = typeof result.score === "number" ? result.score : null;

  return {
    bureauHasHit: score !== null,
    bureauScore: score,
    bureauPassed: approved,
    publicDecision: approved ? "approved" : "rejected",
    internalDecision: approved ? "approved_for_followup" : "rejected",
    suggestedCreditLine: null,
    documentsComplete: true,
    documentReviewRequired: false,
    rejectionReason: approved ? null : score === null ? "no_credit_history" : "score_below_minimum",
    evaluatedAt: new Date().toISOString(),
  };
}

function decisionResultForApplication(application: Application, flow: SolicitudFlowState): CreditDecision {
  const evaluation = flow.creditEvaluation;
  if (!evaluation) {
    throw new Error("Evaluación de crédito no disponible.");
  }

  const approved = evaluation.publicDecision === "approved";
  return {
    applicationId: application.id,
    decision: approved ? "aprobada" : "rechazada",
    status: approved ? (evaluation.documentReviewRequired ? "documentos_pendientes" : "investigacion_legal") : "rechazada",
    requestedAmount: flow.requestedAmount ?? application.requestedAmount,
    assignedCreditLine: evaluation.suggestedCreditLine,
    bureauScore: evaluation.bureauScore,
    finalScore: null,
    riskLevel: riskFromScore(evaluation.bureauScore),
    rejectionReason: rejectionReasonFromEvaluation(evaluation.rejectionReason),
    message: approved
      ? evaluation.documentReviewRequired
        ? "Solicitud aprobada para seguimiento con documentos pendientes."
        : "Solicitud aprobada para seguimiento operativo."
      : "Solicitud rechazada por regla de crédito.",
    evaluatedAt: evaluation.evaluatedAt ?? new Date().toISOString(),
  };
}

async function registerCreditEvaluationEvents(flow: SolicitudFlowState): Promise<void> {
  const evaluation = flow.creditEvaluation;
  if (!evaluation) return;
  const metadata = {
    score: evaluation.bureauScore,
    bureauHasHit: evaluation.bureauHasHit,
    suggestedCreditLine: evaluation.suggestedCreditLine,
    documentsComplete: evaluation.documentsComplete,
    documentReviewRequired: evaluation.documentReviewRequired,
    scenario: flow.demoCreditScenario,
  };

  if (flow.demoCreditScenario) {
    await addTraceEvent(flow.trace_id, {
      step: "buro",
      title: "Configuración de evaluación aplicada",
      description: "Se aplicaron parámetros específicos para la evaluación.",
      status: "warning",
      metadata: {
        eventName: "demo_credit_scenario_applied",
        scenario: flow.demoCreditScenario,
        score: evaluation.bureauScore,
        bureauHasHit: evaluation.bureauHasHit,
      },
    });
  }

  await addTraceEvent(flow.trace_id, {
    step: "buro",
    title: "Consulta Buró iniciada",
    description: "Inicio de consulta de historial crediticio.",
    status: "running",
    metadata: { eventName: "bureau_query_started" },
  });
  await addTraceEvent(flow.trace_id, {
    step: "buro",
    title: "Consulta Buró completada",
    description: evaluation.bureauHasHit ? "Historial crediticio localizado." : "Sin historial crediticio localizado.",
    status: evaluation.bureauHasHit ? "success" : "warning",
    metadata: { eventName: "bureau_query_completed", ...metadata },
  });
  await addTraceEvent(flow.trace_id, {
    step: "buro",
    title: evaluation.bureauHasHit ? "Hit Buró recibido" : "Sin hit Buró",
    description: evaluation.bureauHasHit ? "Se recibió respuesta con historial." : "No se recibió historial.",
    status: evaluation.bureauHasHit ? "success" : "warning",
    metadata: { eventName: evaluation.bureauHasHit ? "bureau_hit_received" : "bureau_no_hit_received", ...metadata },
  });
  if (evaluation.bureauScore !== null) {
    await addTraceEvent(flow.trace_id, {
      step: "decision",
      title: "Score recibido",
      description: `Score obtenido: ${evaluation.bureauScore}.`,
      status: "success",
      metadata: { eventName: "score_received", ...metadata },
    });
  }
  await addTraceEvent(flow.trace_id, {
    step: "decision",
    title: evaluation.bureauPassed ? "Buró aprobado" : "Buró rechazado",
    description: evaluation.bureauPassed ? "La evaluación de Buró permite continuar el proceso." : "La evaluación de Buró no permite continuar.",
    status: evaluation.bureauPassed ? "success" : "error",
    metadata: { eventName: evaluation.bureauPassed ? "bureau_passed" : "bureau_rejected", ...metadata },
  });
  if (evaluation.publicDecision === "rejected") {
    await addTraceEvent(flow.trace_id, {
      step: "decision",
      title: "Crédito rechazado",
      description: "La evaluación inicial rechazó la solicitud.",
      status: "error",
      metadata: { eventName: "credit_rejected", ...metadata },
    });
  }
  if (evaluation.suggestedCreditLine) {
    await addTraceEvent(flow.trace_id, {
      step: "decision",
      title: "Línea sugerida calculada",
      description: `Línea sugerida por score: ${evaluation.suggestedCreditLine}.`,
      status: "success",
      metadata: { eventName: "suggested_credit_line_calculated", ...metadata },
    });
  }
  if (evaluation.documentReviewRequired) {
    await addTraceEvent(flow.trace_id, {
      step: "documentos",
      title: "Seguimiento documental requerido",
      description: "La solicitud aprobada requiere completar documentos.",
      status: "warning",
      metadata: { eventName: "document_followup_required", ...metadata },
    });
  }
  if (evaluation.publicDecision === "approved") {
    await addTraceEvent(flow.trace_id, {
      step: "decision",
      title: "Solicitud aprobada para seguimiento",
      description: "El canal público mostrará aprobación para continuar el proceso.",
      status: "success",
      metadata: { eventName: "application_approved_for_followup", ...metadata },
    });
  }
}

function documentsForKind(kind?: ApplicantKind): SolicitudDocument[] {
  if (kind === "company") {
    return [
      { id: "ine_representante_legal", label: "INE del representante legal", applicationType: "ine_representante_legal", status: "missing" },
      { id: "constancia_situacion_fiscal", label: "Constancia de situación fiscal", applicationType: "constancia_situacion_fiscal", status: "missing" },
      { id: "comprobante_domicilio_empresa", label: "Comprobante de domicilio de la empresa", applicationType: "comprobante_domicilio_empresa", status: "missing" },
      { id: "comprobante_domicilio_representante", label: "Comprobante de domicilio del representante legal", applicationType: "comprobante_domicilio_representante", status: "missing" },
      { id: "estados_cuenta_bancarios", label: "Últimos 3 estados de cuenta bancarios", applicationType: "estados_cuenta_bancarios", status: "missing" },
      { id: "estados_financieros", label: "Estados financieros de los últimos 2 años", applicationType: "estados_financieros", status: "missing" },
      { id: "declaracion_anual", label: "Declaración anual", applicationType: "declaracion_anual", status: "missing" },
      { id: "poder_representante_legal", label: "Poder representante legal", applicationType: "poder_representante_legal", status: "missing" },
      { id: "acta_constitutiva", label: "Acta constitutiva", applicationType: "acta_constitutiva", status: "missing" },
      { id: "opinion_positiva_sat", label: "Opinión positiva del SAT", applicationType: "opinion_positiva_sat", status: "missing" },
      { id: "ine_aval", label: "INE del aval", applicationType: "ine_aval", status: "missing", optional: true },
      { id: "comprobante_domicilio_aval", label: "Comprobante de domicilio del aval", applicationType: "comprobante_domicilio_aval", status: "missing", optional: true },
      { id: "garantia", label: "Documento de garantía", applicationType: "garantia", status: "missing", optional: true },
    ];
  }

  return [
    { id: "ine_titular", label: "INE", applicationType: "ine_titular", status: "missing" },
    { id: "curp", label: "CURP", applicationType: "curp", status: "missing" },
    { id: "constancia_situacion_fiscal", label: "Constancia de situación fiscal", applicationType: "constancia_situacion_fiscal", status: "missing" },
    { id: "comprobante_domicilio_titular", label: "Comprobante de domicilio del titular", applicationType: "comprobante_domicilio_titular", status: "missing" },
    { id: "comprobante_domicilio_negocio", label: "Comprobante de domicilio del negocio", applicationType: "comprobante_domicilio_negocio", status: "missing" },
    { id: "opinion_positiva_sat", label: "Opinión positiva del SAT", applicationType: "opinion_positiva_sat", status: "missing" },
    { id: "estados_cuenta_bancarios", label: "Últimos 3 estados de cuenta bancarios", applicationType: "estados_cuenta_bancarios", status: "missing" },
    { id: "declaracion_anual", label: "Declaración anual", applicationType: "declaracion_anual", status: "missing" },
    { id: "ine_aval", label: "INE del aval", applicationType: "ine_aval", status: "missing", optional: true },
    { id: "comprobante_domicilio_aval", label: "Comprobante de domicilio del aval", applicationType: "comprobante_domicilio_aval", status: "missing", optional: true },
    { id: "garantia", label: "Documento de garantía", applicationType: "garantia", status: "missing", optional: true },
  ];
}

function normalizeFlow(flow: SolicitudFlowState): SolicitudFlowState {
  const currentStep = String(flow.currentStep) === "monto"
    ? "documentos"
    : String(flow.currentStep) === "resumen"
      ? "autorizacion"
      : flow.currentStep;
  const generalData = flow.generalData
    ? normalizeGeneralDataInput(flow.generalData)
    : generalDataFromBasicData(flow.basicData);
  const fiscalIdentity = flow.fiscalIdentity
    ? normalizeFiscalIdentity(flow.fiscalIdentity)
    : fiscalIdentityFromBasicData(flow.basicData);
  const basicData = {
    ...flow.basicData,
    ...basicDataFromGeneralData(generalData, flow.basicData.companyName, fiscalIdentity),
  };
  if (flow.backendDocumentsLoaded) {
    return {
      ...flow,
      currentStep,
      generalData,
      fiscalIdentity,
      basicData,
      phoneVerification: phoneVerificationForPhone(basicData.phone, flow.phoneVerification),
    };
  }

  const normalizedDocuments = documentsForKind(flow.applicantKind);
  const existingById = new Map(flow.documents.map((document) => [document.id, document]));

  return {
    ...flow,
    currentStep,
    generalData,
    fiscalIdentity,
    basicData,
    phoneVerification: phoneVerificationForPhone(basicData.phone, flow.phoneVerification),
    documents: normalizedDocuments.map((document) => ({
      ...document,
      ...existingById.get(document.id),
      label: document.label,
      optional: document.optional,
    })),
  };
}

function markIneDocumentFromStart(document: SolicitudDocument, flow: SolicitudFlowState): SolicitudDocument {
  const searchable = `${document.id} ${document.label} ${document.backendKey ?? ""}`.toLowerCase();
  const isStartupIne =
    document.applicationType === "ine_titular" ||
    document.applicationType === "ine_representante_legal" ||
    (searchable.includes("ine") && !searchable.includes("aval"));
  if (!isStartupIne) return document;
  if (!flow.ineFront || !flow.ineBack) return document;
  return {
    ...document,
    status: "uploaded",
    file: flow.ineFront,
  };
}

function applyCompletedIneProcessing(
  flow: SolicitudFlowState,
  onboardingResult: StartOnboardingResult,
): SolicitudFlowState {
  const ocrPrefill = applyIneOcrToGeneralData(
    flow.generalData,
    onboardingResult.ocr,
    { replaceFields: flow.ocrPrefillFields },
  );
  const currentFiscalIdentity = flow.fiscalIdentity ?? EMPTY_FISCAL_IDENTITY;
  const ocrFiscalIdentity = fiscalIdentityFromOcr(onboardingResult.ocr);
  const nextFiscalIdentity = ocrFiscalIdentity.source !== "empty" ? ocrFiscalIdentity : currentFiscalIdentity;
  const nextGeneralData = ocrPrefill.generalData;

  return saveFlow({
    ...flow,
    ineReviewed: true,
    backendTraceId: onboardingResult.trace_id || flow.backendTraceId,
    ineOcr: onboardingResult.ocr ?? flow.ineOcr,
    generalData: nextGeneralData,
    fiscalIdentity: nextFiscalIdentity,
    basicData: basicDataFromGeneralData(nextGeneralData, flow.basicData.companyName, nextFiscalIdentity),
    ocrPrefillFields: ocrPrefill.prefilledFields.length > 0
      ? Array.from(new Set([...(flow.ocrPrefillFields ?? []), ...ocrPrefill.prefilledFields]))
      : flow.ocrPrefillFields,
    ineProcessingStatus: "completed",
    ineProcessingRequestId: undefined,
    ineProcessingMessage: undefined,
    currentStep: flow.currentStep === "revision_ine" ? "datos_basicos" : flow.currentStep,
  });
}

function markIneProcessingFailed(flowId: string, requestId: string): void {
  const latest = readStore().find((item) => item.flowId === flowId);
  if (!latest || latest.ineProcessingRequestId !== requestId) return;
  saveFlow({
    ...latest,
    ineProcessingStatus: "failed",
    ineProcessingMessage: "No pudimos terminar de revisar tu identificación. Intenta nuevamente.",
  });
}

function finalizeIneProcessing(
  flowId: string,
  requestId: string,
  onboardingResult: StartOnboardingResult,
): SolicitudFlowState | null {
  const latest = readStore().find((item) => item.flowId === flowId);
  if (!latest || latest.ineProcessingRequestId !== requestId) return null;
  return applyCompletedIneProcessing(latest, onboardingResult);
}

async function waitForIneProcessing(
  onboardingPromise: Promise<StartOnboardingResult>,
): Promise<{ timedOut: true } | { timedOut: false; result: StartOnboardingResult }> {
  let timeoutId: number | undefined;
  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timeoutId = window.setTimeout(() => resolve({ timedOut: true }), INE_AUTO_CONTINUE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([
      onboardingPromise.then((result) => ({ timedOut: false as const, result })),
      timeout,
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

async function addPublicEvent(
  flow: SolicitudFlowState,
  publicEvent: string,
  title: string,
  step: SolicitudStep,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await addTraceEvent(flow.trace_id, {
    step: traceStepForPublicStep(step),
    title,
    description: title,
    status: "success",
    metadata: { public_event: publicEvent, flow_id: flow.flowId, ...metadata },
  });
}

export async function createSolicitudFlow(demoCreditScenario?: DemoCreditScenario): Promise<SolicitudFlowState> {
  const trace = await createTrace({});
  const createdAt = new Date();
  const now = createdAt.toISOString();
  const flow: SolicitudFlowState = {
    flowId: createFlowId(),
    recoveryFolio: createRecoveryFolio(),
    expiresAt: new Date(createdAt.getTime() + SOLICITUD_RECOVERY_TTL_MS).toISOString(),
    trace_id: trace.trace_id,
    currentStep: "tipo_solicitante",
    ineProcessingStatus: "idle",
    ineProcessingRequestId: undefined,
    ineReviewed: false,
    basicData: EMPTY_BASIC_DATA,
    generalData: EMPTY_ONBOARDING_GENERAL_DATA,
    fiscalIdentity: EMPTY_FISCAL_IDENTITY,
    businessData: EMPTY_BUSINESS_DATA,
    documents: documentsForKind(),
    phoneVerification: phoneVerificationForPhone(""),
    authorizationAccepted: false,
    demoCreditScenario,
    createdAt: now,
    updatedAt: now,
  };
  const saved = saveFlow(flow);
  await addPublicEvent(saved, "solicitud_iniciada", "Solicitud iniciada", "bienvenida");
  return saved;
}

export async function getSolicitudFlow(flowId: string): Promise<SolicitudFlowState | null> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  return flow ? saveFlow(normalizeFlow(flow)) : null;
}

export async function getSolicitudFlowByRecoveryFolio(folio: string): Promise<SolicitudFlowState | null> {
  await wait();
  const normalizedFolio = normalizeRecoveryFolio(folio);
  if (!normalizedFolio) return null;
  const flow = readStore().find((item) =>
    normalizeRecoveryFolio(item.recoveryFolio ?? "") === normalizedFolio ||
    normalizeRecoveryFolio(item.folio ?? "") === normalizedFolio,
  );
  return flow ? saveFlow(normalizeFlow(flow)) : null;
}

export function persistSolicitudDraft(flow: SolicitudFlowState): SolicitudFlowState {
  return saveFlow(normalizeFlow(flow));
}

export async function updateSolicitudStep(flowId: string, currentStep: SolicitudStep): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const nextFlow = saveFlow({ ...flow, currentStep });
  if (flow.currentStep === "documentos" && currentStep === "phone_verification") {
    await addPublicEvent(nextFlow, "documental_stage_completed", "Documentos revisados para continuar", "documentos", {
      documentProgress: nextFlow.documentProgress,
    });
  }
  return nextFlow;
}

export async function selectApplicantKind(flowId: string, applicantKind: ApplicantKind): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const nextFlow = saveFlow({
    ...flow,
    applicantKind,
    documents: documentsForKind(applicantKind),
    hasGuarantor: undefined,
    hasCollateral: undefined,
    currentStep: "ine",
  });
  await addPublicEvent(nextFlow, "tipo_solicitante_seleccionado", "Tipo de solicitante seleccionado", "tipo_solicitante", {
    applicant_kind: applicantKind,
  });
  return nextFlow;
}

export async function saveIneFile(
  flowId: string,
  side: "front" | "back",
  file: StoredFile,
): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const [ineFront, ineBack] = await Promise.all([
    optimizeStoredImage(side === "front" ? file : flow.ineFront),
    optimizeStoredImage(side === "back" ? file : flow.ineBack),
  ]);
  const nextFlow = saveFlow({
    ...flow,
    ineFront,
    ineBack,
    ineReviewed: false,
    ineProcessingStatus: "idle",
    ineProcessingRequestId: undefined,
    ineProcessingStartedAt: undefined,
    ineProcessingMessage: undefined,
    backendTraceId: undefined,
    ineOcr: undefined,
    fiscalIdentity: flow.fiscalIdentity?.source === "manual" ? flow.fiscalIdentity : EMPTY_FISCAL_IDENTITY,
    backendDocumentsLoaded: false,
  });
  await addPublicEvent(
    nextFlow,
    side === "front" ? "ine_frente_cargada" : "ine_reverso_cargada",
    side === "front" ? "INE frente cargada" : "INE reverso cargada",
    "ine",
    { file_name: file.name },
  );
  return nextFlow;
}

export async function confirmIneReview(flowId: string, accepted: boolean): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  if (accepted && (!flow.ineFront || !flow.ineBack)) {
    throw new Error("No pudimos iniciar la solicitud en este momento. Intenta nuevamente.");
  }
  if (!accepted || !flow.ineFront || !flow.ineBack) {
    return saveFlow({ ...flow, ineReviewed: false, currentStep: "revision_ine" });
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const processingFlow = saveFlow({
    ...flow,
    ineReviewed: true,
    ineProcessingStatus: "processing",
    ineProcessingRequestId: requestId,
    ineProcessingStartedAt: new Date().toISOString(),
    ineProcessingMessage: "Estamos preparando la información de tu identificación.",
  });
  const onboardingPromise = startOnboardingFlow({
    flowId: processingFlow.flowId,
    applicantKind: processingFlow.applicantKind ?? "physical",
    ineFront: processingFlow.ineFront!,
    ineBack: processingFlow.ineBack!,
  });

  let outcome: Awaited<ReturnType<typeof waitForIneProcessing>>;
  try {
    outcome = await waitForIneProcessing(onboardingPromise);
  } catch (processingError) {
    markIneProcessingFailed(flowId, requestId);
    throw processingError;
  }

  let nextFlow: SolicitudFlowState;
  if (outcome.timedOut) {
    nextFlow = saveFlow({
      ...processingFlow,
      currentStep: "datos_basicos",
      ineProcessingStatus: "processing",
      ineProcessingMessage: "Puedes continuar con tus datos mientras terminamos de preparar tu identificación.",
    });
    void onboardingPromise
      .then((result) => finalizeIneProcessing(flowId, requestId, result))
      .catch(() => markIneProcessingFailed(flowId, requestId));
  } else {
    nextFlow = applyCompletedIneProcessing(processingFlow, outcome.result);
  }
  await addPublicEvent(nextFlow, "ine_revision_visual_confirmada", "Revisión visual de INE confirmada", "revision_ine", {
    accepted,
    continuedWhileProcessing: outcome.timedOut,
  });
  return nextFlow;
}

export async function saveBasicData(flowId: string, generalData: OnboardingGeneralData): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  if (flow.ineProcessingStatus === "processing") {
    throw new Error("Seguimos preparando tu identificación. Espera unos segundos para continuar.");
  }
  const normalizedGeneralData = normalizeGeneralDataInput(generalData);
  const localFlow = { ...flow, generalData: normalizedGeneralData };
  const issues = generalDataCorrectionIssues(localFlow);
  if (issues.length > 0) {
    throw new SolicitudCorrectionError("Revisa los datos marcados antes de continuar.", issues);
  }
  const response = await saveOnboardingGeneralData(mapGeneralDataToBackendPayload(normalizedGeneralData, backendTraceIdOrThrow(flow)));
  const fiscalIdentity = resolveFiscalIdentityAfterGeneralData({
    response,
    ocrFiscalIdentity: extractFiscalIdentityFromOcr(flow.ineOcr),
    current: flow.fiscalIdentity ?? fiscalIdentityFromBasicData(flow.basicData),
  });
  const basicData = basicDataFromGeneralData(normalizedGeneralData, flow.basicData.companyName, fiscalIdentity);
  const nextFlow = saveFlow({
    ...flow,
    generalData: normalizedGeneralData,
    fiscalIdentity,
    basicData,
    currentStep: "fiscal_identity",
    phoneVerification: phoneVerificationForPhone(basicData.phone, flow.phoneVerification),
    phoneVerified: flow.phoneVerification?.phone === digitsOnly(basicData.phone) ? flow.phoneVerified : false,
    phoneVerifiedAt: flow.phoneVerification?.phone === digitsOnly(basicData.phone) ? flow.phoneVerifiedAt : undefined,
  });
  await addPublicEvent(nextFlow, "datos_basicos_capturados", "Datos básicos capturados", "datos_basicos");
  await addPublicEvent(nextFlow, "general_data_saved", "Datos generales guardados", "datos_basicos");
  if (fiscalIdentity.source === "backend") {
    await addPublicEvent(nextFlow, "fiscal_identity_received", "Datos fiscales recibidos", "fiscal_identity");
  }
  return nextFlow;
}

export async function saveFiscalIdentity(flowId: string, fiscalIdentity: FiscalIdentity): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const identityToValidate = normalizeFiscalIdentity({
    ...fiscalIdentity,
    source: fiscalIdentity.source === "empty" ? "manual" : fiscalIdentity.source,
    confirmed: false,
  });
  const issues = fiscalIdentityCorrectionIssues({ ...flow, fiscalIdentity: identityToValidate });
  if (issues.length > 0) {
    throw new SolicitudCorrectionError("Revisa tus datos de identificación antes de continuar.", issues);
  }
  const validationResult = await validateFiscalIdentityWithBackend({
    trace_id: backendTraceIdOrThrow(flow),
    rfc: identityToValidate.rfc,
    curp: identityToValidate.curp,
  });
  if (validationResult.validado === false) {
    throw new SolicitudCorrectionError("No pudimos validar los datos de identificación.", [
      {
        field: "rfc",
        label: "RFC",
        message: "El RFC no coincide con los datos capturados. Revísalo e intenta nuevamente.",
        step: "fiscal_identity",
      },
    ]);
  }
  const normalizedFiscalIdentity = normalizeFiscalIdentity({
    ...identityToValidate,
    rfc: validationResult.rfc ?? identityToValidate.rfc,
    curp: validationResult.curp ?? identityToValidate.curp,
    confirmed: true,
  });
  const basicData = basicDataFromGeneralData(flow.generalData, flow.basicData.companyName, normalizedFiscalIdentity);
  const nextFlow = saveFlow({
    ...flow,
    fiscalIdentity: normalizedFiscalIdentity,
    basicData,
    currentStep: "datos_negocio",
  });
  await addPublicEvent(nextFlow, "fiscal_identity_confirmed", "Datos fiscales confirmados", "fiscal_identity");
  await addPublicEvent(nextFlow, "fiscal_identity_validated", "Datos fiscales validados", "fiscal_identity", {
    etapa_actual: validationResult.etapa_actual,
  });
  if (normalizedFiscalIdentity.source === "manual") {
    await addPublicEvent(nextFlow, "fiscal_identity_completed_manually", "Datos fiscales capturados", "fiscal_identity");
  }
  return nextFlow;
}

export async function saveBusinessData(flowId: string, businessData: BusinessData): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  await saveOnboardingBusinessData({
    trace_id: backendTraceIdOrThrow(flow),
    actividad_negocio: businessData.activity,
    anios_operacion: Number(businessData.seniorityYears) || 0,
    ingresos_mensuales: Number(businessData.monthlyIncome) || 0,
  });
  const nextFlow = saveFlow({ ...flow, businessData, currentStep: "documentos" });
  await addPublicEvent(nextFlow, "datos_negocio_capturados", "Datos del negocio capturados", "datos_negocio");
  await addPublicEvent(nextFlow, "business_data_saved", "Datos del negocio guardados", "datos_negocio");
  return nextFlow;
}

export async function loadSolicitudRequiredDocuments(flowId: string): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  if (flow.backendDocumentsLoaded) return structuredClone(normalizeFlow(flow));

  const loaded = await loadRequiredDocuments(backendTraceIdOrThrow(flow), flow.documents);
  const nextFlow = saveFlow({
    ...flow,
    documents: loaded.documents.map((document) => markIneDocumentFromStart(document, flow)),
    documentProgress: loaded.progress ?? flow.documentProgress,
    backendDocumentsLoaded: true,
  });
  await addPublicEvent(nextFlow, "lista_documentos_cargada", "Lista de documentos cargada", "documentos");
  await addPublicEvent(nextFlow, "required_documents_loaded", "Documentos requeridos cargados", "documentos", {
    documentProgress: nextFlow.documentProgress,
  });
  return nextFlow;
}

export async function saveDocumentFile(
  flowId: string,
  documentId: string,
  file: StoredFile,
  status = "uploaded" as const,
): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const documentToUpload = flow.documents.find((document) => document.id === documentId);
  if (!documentToUpload) throw new Error("No pudimos subir el archivo. Intenta nuevamente.");
  const uploadResult = await uploadDocument({
    traceId: backendTraceIdOrThrow(flow),
    document: documentToUpload,
    file,
  });
  const uploadedPhone = uploadResult.telefono ? digitsOnly(uploadResult.telefono) : "";
  const nextPhoneVerification = uploadedPhone
    ? phoneVerificationForPhone(uploadedPhone, flow.phoneVerification)
    : flow.phoneVerification;
  const nextFlow = saveFlow({
    ...flow,
    documentProgress: uploadResult.progreso
      ? {
          totalRequired: uploadResult.progreso.total_requeridos,
          totalUploaded: uploadResult.progreso.total_cargados,
          completed: uploadResult.progreso.completado ?? uploadResult.completado,
        }
      : flow.documentProgress,
    phoneVerification: nextPhoneVerification,
    documents: flow.documents.map((document) =>
      document.id === documentId ? { ...document, file, status } : document,
    ),
  });
  const document = nextFlow.documents.find((item) => item.id === documentId);
  await addPublicEvent(nextFlow, "documento_agregado", "Documento agregado", "documentos", {
    document_id: documentId,
    document_label: document?.label,
    file_name: file.name,
  });
  await addPublicEvent(nextFlow, "document_uploaded", "Documento cargado", "documentos", {
    document_id: documentId,
    document_label: document?.label,
    etapa_actual: uploadResult.etapa_actual,
    completed: uploadResult.completado,
    documentProgress: nextFlow.documentProgress,
  });
  return nextFlow;
}

export async function removeDocumentFile(flowId: string, documentId: string): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  return saveFlow({
    ...flow,
    documents: flow.documents.map((document) =>
      document.id === documentId ? { ...document, file: undefined, status: "missing" } : document,
    ),
  });
}

export async function setGuarantorChoice(flowId: string, hasGuarantor: boolean): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const documents = hasGuarantor
    ? flow.documents
    : flow.documents.map((document) =>
        document.backendGroup === "aval" ||
        document.applicationType === "ine_aval" ||
        document.applicationType === "comprobante_domicilio_aval"
          ? { ...document, file: undefined, status: "missing" as const }
          : document,
      );
  return saveFlow({ ...flow, hasGuarantor, documents });
}

export async function setCollateralChoice(flowId: string, hasCollateral: boolean): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const documents = hasCollateral
    ? flow.documents
    : flow.documents.map((document) =>
        document.backendGroup === "garantia" || document.applicationType === "garantia"
          ? { ...document, file: undefined, status: "missing" as const }
          : document,
      );
  return saveFlow({ ...flow, hasCollateral, documents });
}

export async function sendPhoneVerificationCode(flowId: string, eventName = "sms_enviado"): Promise<SolicitudFlowState> {
  await wait(650);
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");

  const phoneVerification = phoneVerificationForPhone(flow.phoneVerification.phone || flow.basicData.phone, flow.phoneVerification);
  if (phoneVerification.phone.length !== 10) {
    throw new Error("Necesitamos tu número celular para enviarte el código.");
  }
  const smsResult = await sendOnboardingSms(backendTraceIdOrThrow(flow));

  const nextFlow = saveFlow({
    ...flow,
    currentStep: "phone_verification",
    phoneVerification: {
      ...phoneVerification,
      codeSent: true,
      codeVerified: false,
      sentAt: new Date().toISOString(),
      expiresAt: smsResult.vigente_hasta,
      lastError: undefined,
    },
    phoneVerified: false,
    phoneVerifiedAt: undefined,
  });
  await addPublicEvent(nextFlow, eventName, eventName === "otp_reenviado" ? "Código reenviado" : "Código enviado", "phone_verification", {
    eventName,
    maskedPhone: nextFlow.phoneVerification.maskedPhone,
    attempts: nextFlow.phoneVerification.attempts,
  });
  await addPublicEvent(nextFlow, "sms_sent", "SMS enviado", "phone_verification", {
    maskedPhone: nextFlow.phoneVerification.maskedPhone,
    expiresAt: smsResult.vigente_hasta,
  });
  return nextFlow;
}

export function isSmsVerificationApproved(result: { valid: unknown }): boolean {
  return result.valid === true;
}

export async function verifyPhoneCode(flowId: string, code: string): Promise<SolicitudFlowState> {
  await wait(650);
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");

  const phoneVerification = phoneVerificationForPhone(flow.phoneVerification.phone || flow.basicData.phone, flow.phoneVerification);
  if (phoneVerification.phone.length !== 10) {
    throw new Error("Necesitamos tu número celular para enviarte el código.");
  }

  const attempts = phoneVerification.attempts + 1;
  const smsResult = await validateOnboardingSms(backendTraceIdOrThrow(flow), code);
  const verified = isSmsVerificationApproved(smsResult);
  const nextFlow = saveFlow({
    ...flow,
    currentStep: "phone_verification",
    phoneVerification: {
      ...phoneVerification,
      codeSent: true,
      codeVerified: verified,
      attempts,
      verifiedAt: verified ? new Date().toISOString() : phoneVerification.verifiedAt,
      lastError: verified ? undefined : smsResult.message ?? "El código no coincide. Revisa los dígitos e inténtalo de nuevo.",
    },
    phoneVerified: verified,
    phoneVerifiedAt: verified ? new Date().toISOString() : flow.phoneVerifiedAt,
  });

  await addPublicEvent(nextFlow, "otp_capturado", "Código capturado", "phone_verification", {
    eventName: "otp_capturado",
    maskedPhone: nextFlow.phoneVerification.maskedPhone,
    attempts,
  });
  await addPublicEvent(nextFlow, verified ? "otp_verificado" : "otp_fallido", verified ? "Celular verificado" : "Código incorrecto", "phone_verification", {
    eventName: verified ? "otp_verificado" : "otp_fallido",
    maskedPhone: nextFlow.phoneVerification.maskedPhone,
    attempts,
  });
  await addPublicEvent(nextFlow, verified ? "sms_validated" : "sms_validation_failed", verified ? "SMS validado" : "SMS no validado", "phone_verification", {
    maskedPhone: nextFlow.phoneVerification.maskedPhone,
    attempts,
    etapa_actual: smsResult.etapa_actual,
  });

  return nextFlow;
}

export async function acceptAuthorization(flowId: string, accepted: boolean): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const nextFlow = saveFlow({ ...flow, authorizationAccepted: accepted, currentStep: "autorizacion" });
  if (accepted) {
    await addPublicEvent(nextFlow, "autorizacion_aceptada", "Autorización aceptada", "autorizacion");
  }
  return nextFlow;
}

export async function startSolicitudProcessing(flowId: string): Promise<SolicitudFlowState> {
  await wait(200);
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  return saveFlow({
    ...flow,
    currentStep: "processing",
    processingStartedAt: new Date().toISOString(),
  });
}

function initialDocumentStatuses(flow: SolicitudFlowState): Record<string, DocumentStatus> {
  return flow.documents.reduce<Record<string, DocumentStatus>>((statuses, document) => {
    statuses[document.applicationType] = mapPublicDocumentStatus(document.status);
    if (document.id === "ine_titular" && flow.ineFront && flow.ineBack) {
      statuses[document.applicationType] = "cargado";
    }
    if (document.id === "ine_representante_legal" && flow.ineFront && flow.ineBack) {
      statuses[document.applicationType] = "cargado";
    }
    return statuses;
  }, {});
}

function buildApplicationPayload(flow: SolicitudFlowState): CreateApplicationPayload {
  const personType = personTypeFromKind(flow.applicantKind);
  const requestedAmount = flow.requestedAmount ?? 10000;
  const seniorityYears = Number(flow.businessData.seniorityYears) || 1;
  const averageMonthlyIncome = Number(flow.businessData.monthlyIncome) || 25000;
  const rfc = flow.basicData.rfc || (personType === "fisica" ? "XAXX010101000" : "XAXX010101001");
  const curp = flow.basicData.curp || "XEXX010101HPLXXXA0";

  if (personType === "moral") {
    return {
      trace_id: flow.trace_id,
      personType,
      scenario: "persona_moral_hit_buro",
      requestedAmount,
      executiveName: "Portal ALPEZ",
      moralPerson: {
        legalName: flow.basicData.companyName || "Empresa solicitante",
        commercialName: flow.basicData.companyName || "Empresa solicitante",
        rfc,
        businessLine: flow.businessData.activity || "Comercio",
        companySeniorityYears: seniorityYears,
        companyAddress: DEFAULT_ADDRESS,
        averageMonthlyIncome,
        annualSales: Number(flow.businessData.annualSales) || averageMonthlyIncome * 12,
      },
      legalRepresentative: {
        fullName: flow.basicData.representativeName || flow.basicData.fullName || "Representante legal",
        rfc,
        curp,
        phone: flow.basicData.phone || "2220000000",
        email: flow.basicData.email || "contacto@alpez.mx",
        address: DEFAULT_ADDRESS,
      },
      initialDocumentStatuses: initialDocumentStatuses(flow),
    };
  }

  const parts = (flow.basicData.fullName || "Persona solicitante").trim().split(/\s+/);
  return {
    trace_id: flow.trace_id,
    personType,
    scenario: "persona_fisica_hit_buro",
    requestedAmount,
    executiveName: "Portal ALPEZ",
    physicalPerson: {
      firstName: parts[0] ?? "Persona",
      lastName: parts.slice(1).join(" ") || "Solicitante",
      rfc,
      curp,
      birthDate: "1990-01-01",
      phone: flow.basicData.phone || "2220000000",
      email: flow.basicData.email || "contacto@alpez.mx",
      personalAddress: DEFAULT_ADDRESS,
      businessAddress: DEFAULT_ADDRESS,
      businessActivity: flow.businessData.activity || "Comercio",
      businessSeniorityYears: seniorityYears,
      averageMonthlyIncome,
    },
    initialDocumentStatuses: initialDocumentStatuses(flow),
  };
}

export async function submitSolicitudFlow(flowId: string): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  validateFlowBeforeSubmission(flow);
  if ((flow.applicantKind === "physical" || flow.applicantKind === "company") && !flow.phoneVerified) {
    throw new Error("Necesitamos confirmar tu celular antes de enviar la solicitud.");
  }
  if (!flow.authorizationAccepted) throw new Error("Necesitamos tu autorización para continuar con la solicitud.");

  let bureauConsultation: ConsultBureauResult;
  try {
    bureauConsultation = await consultOnboardingBureau(
      { trace_id: backendTraceIdOrThrow(flow) },
      fallbackBureauResultForFlow(flow),
    );
  } catch (consultationError) {
    const correctionError = finalCorrectionError(consultationError);
    if (correctionError) throw correctionError;
    throw consultationError;
  }
  const creditEvaluation = creditEvaluationFromBureauResult(bureauConsultation);
  const publicCreditResult: PublicCreditResult = bureauConsultation.aprobadoPreliminar ? "approved" : "rejected";

  let nextFlow = flow;
  if (!flow.application_id) {
    const application = await createApplication(buildApplicationPayload(flow));
    await linkTraceApplication(flow.trace_id, application.id);
    const flowWithEvaluation = {
      ...flow,
      application_id: application.id,
      folio: bureauConsultation.folio ?? application.folio,
      creditEvaluation,
      bureauConsultation,
      publicCreditResult,
    };
    const decisionResult = decisionResultForApplication(application, flowWithEvaluation);
    const documentSummary = calculateDocumentSummary(application.documents);
    const workflow = deriveInternalWorkflowState(creditEvaluation, documentSummary);
    const validationEvents = createValidationEvents(flowWithEvaluation, creditEvaluation.evaluatedAt);
    const notificationRequests = [
      createNotificationRequest(flowWithEvaluation, application.id, "application_received"),
      ...(creditEvaluation.publicDecision === "approved"
        ? [createNotificationRequest(flowWithEvaluation, application.id, "approved_for_followup")]
        : []),
    ];
    await updateApplication(application.id, {
      status: decisionResult.status,
      decision: decisionResult.decision,
      rejectionReason: decisionResult.rejectionReason,
      assignedCreditLine: decisionResult.assignedCreditLine,
      bureauScore: decisionResult.bureauScore,
      finalScore: decisionResult.finalScore,
      riskLevel: decisionResult.riskLevel,
      decisionResult,
      creditEvaluation,
      demoCreditScenario: flow.demoCreditScenario,
      validationEvents,
      notificationRequests,
      documentsComplete: creditEvaluation.documentsComplete,
      documentSummary,
      internalWorkflowStatus: workflow.status,
      internalNextAction: workflow.nextAction,
      documentReviewRequired: creditEvaluation.documentReviewRequired,
      requiresDocumentFollowUp: creditEvaluation.documentReviewRequired,
      otpVerified: flow.phoneVerified,
      otpVerifiedAt: flow.phoneVerifiedAt,
      bureauHasHit: creditEvaluation.bureauHasHit,
    });
    nextFlow = {
      ...flowWithEvaluation,
      application_id: application.id,
      folio: bureauConsultation.folio ?? application.folio,
      currentStep: "final",
      submittedAt: new Date().toISOString(),
    };
  } else {
    const existingApplication = await getApplicationById(flow.application_id);
    if (!existingApplication) throw new Error("Solicitud no encontrada.");
    const flowWithEvaluation = {
      ...flow,
      creditEvaluation,
      bureauConsultation,
      publicCreditResult,
    };
    const decisionResult = decisionResultForApplication(existingApplication, flowWithEvaluation);
    const documentSummary = calculateDocumentSummary(existingApplication.documents);
    const workflow = deriveInternalWorkflowState(creditEvaluation, documentSummary);
    const validationEvents = createValidationEvents(flowWithEvaluation, creditEvaluation.evaluatedAt);
    const notificationRequests = [
      ...(existingApplication.notificationRequests ?? []),
      createNotificationRequest(flowWithEvaluation, existingApplication.id, "application_received"),
      ...(creditEvaluation.publicDecision === "approved"
        ? [createNotificationRequest(flowWithEvaluation, existingApplication.id, "approved_for_followup")]
        : []),
    ];
    const application = await updateApplication(flow.application_id, {
      status: decisionResult.status,
      decision: decisionResult.decision,
      rejectionReason: decisionResult.rejectionReason,
      assignedCreditLine: decisionResult.assignedCreditLine,
      bureauScore: decisionResult.bureauScore,
      finalScore: decisionResult.finalScore,
      riskLevel: decisionResult.riskLevel,
      decisionResult,
      creditEvaluation,
      demoCreditScenario: flow.demoCreditScenario,
      validationEvents,
      notificationRequests,
      documentsComplete: creditEvaluation.documentsComplete,
      documentSummary,
      internalWorkflowStatus: workflow.status,
      internalNextAction: workflow.nextAction,
      documentReviewRequired: creditEvaluation.documentReviewRequired,
      requiresDocumentFollowUp: creditEvaluation.documentReviewRequired,
      otpVerified: flow.phoneVerified,
      otpVerifiedAt: flow.phoneVerifiedAt,
      bureauHasHit: creditEvaluation.bureauHasHit,
    });
    nextFlow = {
      ...flow,
      folio: bureauConsultation.folio ?? flow.folio ?? application.folio,
      creditEvaluation,
      bureauConsultation,
      publicCreditResult,
      currentStep: "final",
      submittedAt: flow.submittedAt ?? new Date().toISOString(),
    };
  }

  const saved = saveFlow(nextFlow);
  await registerCreditEvaluationEvents(saved);
  await addPublicEvent(saved, "solicitud_enviada", "Solicitud enviada", "final", { folio: saved.folio });
  return saved;
}

export async function markPublicResultDisplayed(flowId: string): Promise<SolicitudFlowState> {
  await wait(100);
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  if (flow.publicResultDisplayedAt) return structuredClone(flow);

  const nextFlow = saveFlow({
    ...flow,
    publicResultDisplayedAt: new Date().toISOString(),
  });
  await addTraceEvent(flow.trace_id, {
    step: "finalizado",
    title: "Resultado público mostrado",
    description: "El cliente visualizó el resultado de la solicitud.",
    status: "success",
    metadata: {
      eventName: flow.creditEvaluation?.publicDecision === "approved" ? "public_approval_displayed" : "public_rejection_displayed",
      result: flow.publicCreditResult,
      folio: flow.folio,
    },
  });
  return nextFlow;
}
