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
  DemoCreditScenario,
  PhoneVerificationState,
  SolicitudDocument,
  SolicitudFlowState,
  SolicitudStep,
  StoredFile,
} from "../types/solicitud.types";
import { mapPublicDocumentStatus } from "../types/solicitud.types";
import {
  areRequiredDocumentsComplete,
  evaluateCreditByPersonType,
  getPublicCreditResult,
  scoreRangeLabel,
} from "../utils/creditEvaluation";
import { resolveDemoCreditScenario } from "../utils/demoCreditScenario";

const STORAGE_KEY = "alpez_public_solicitud_flows";
const DEMO_OTP_CODE = "123456";

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

  try {
    return JSON.parse(saved) as SolicitudFlowState[];
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function writeStore(flows: SolicitudFlowState[]): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(flows));
  }
}

function saveFlow(flow: SolicitudFlowState): SolicitudFlowState {
  const flows = readStore();
  const exists = flows.some((item) => item.flowId === flow.flowId);
  const nextFlow = { ...flow, updatedAt: new Date().toISOString() };
  writeStore(exists ? flows.map((item) => (item.flowId === flow.flowId ? nextFlow : item)) : [nextFlow, ...flows]);
  return structuredClone(nextFlow);
}

function createFlowId(): string {
  return `SOL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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
  if (step === "resumen" || step === "final") return "finalizado";
  if (step === "bienvenida" || step === "tipo_solicitante") return "originacion_iniciada";
  return "captura_datos";
}

function simulatedBureauInput(flow: SolicitudFlowState): { bureauHasHit: boolean; bureauScore: number | null } {
  const searchable = `${flow.basicData.fullName} ${flow.basicData.companyName} ${flow.basicData.rfc}`.toLowerCase();
  if (searchable.includes("sin historial")) return { bureauHasHit: false, bureauScore: null };
  if (searchable.includes("rechazo")) return { bureauHasHit: true, bureauScore: 610 };

  const amount = flow.requestedAmount ?? 30000;
  if (amount <= 10000) return { bureauHasHit: true, bureauScore: 640 };
  if (amount <= 20000) return { bureauHasHit: true, bureauScore: 660 };
  if (amount <= 30000) return { bureauHasHit: true, bureauScore: 680 };
  if (amount <= 40000) return { bureauHasHit: true, bureauScore: 700 };
  return { bureauHasHit: true, bureauScore: 725 };
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
      : "Solicitud rechazada por regla de crédito simulada.",
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
      title: "Escenario demo aplicado",
      description: "Se aplicó un escenario de evaluación forzado para demostración.",
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
    description: "Inicio de consulta simulada de historial crediticio.",
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
  const normalizedDocuments = documentsForKind(flow.applicantKind);
  const existingById = new Map(flow.documents.map((document) => [document.id, document]));

  return {
    ...flow,
    phoneVerification: phoneVerificationForPhone(flow.basicData.phone, flow.phoneVerification),
    documents: normalizedDocuments.map((document) => ({
      ...document,
      ...existingById.get(document.id),
      label: document.label,
      optional: document.optional,
    })),
  };
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
  const now = new Date().toISOString();
  const flow: SolicitudFlowState = {
    flowId: createFlowId(),
    trace_id: trace.trace_id,
    currentStep: "tipo_solicitante",
    ineReviewed: false,
    basicData: EMPTY_BASIC_DATA,
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
  return flow ? structuredClone(normalizeFlow(flow)) : null;
}

export async function updateSolicitudStep(flowId: string, currentStep: SolicitudStep): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  return saveFlow({ ...flow, currentStep });
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
  const nextFlow = saveFlow({
    ...flow,
    ineFront: side === "front" ? file : flow.ineFront,
    ineBack: side === "back" ? file : flow.ineBack,
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
  const nextFlow = saveFlow({ ...flow, ineReviewed: accepted, currentStep: accepted ? "datos_basicos" : "revision_ine" });
  await addPublicEvent(nextFlow, "ine_revision_visual_confirmada", "Revisión visual de INE confirmada", "revision_ine", {
    accepted,
  });
  return nextFlow;
}

export async function saveBasicData(flowId: string, basicData: BasicData): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const nextFlow = saveFlow({
    ...flow,
    basicData,
    currentStep: "datos_negocio",
    phoneVerification: phoneVerificationForPhone(basicData.phone, flow.phoneVerification),
    phoneVerified: flow.phoneVerification?.phone === digitsOnly(basicData.phone) ? flow.phoneVerified : false,
    phoneVerifiedAt: flow.phoneVerification?.phone === digitsOnly(basicData.phone) ? flow.phoneVerifiedAt : undefined,
  });
  await addPublicEvent(nextFlow, "datos_basicos_capturados", "Datos básicos capturados", "datos_basicos");
  return nextFlow;
}

export async function saveBusinessData(flowId: string, businessData: BusinessData): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const nextFlow = saveFlow({ ...flow, businessData, currentStep: "monto" });
  await addPublicEvent(nextFlow, "datos_negocio_capturados", "Datos del negocio capturados", "datos_negocio");
  return nextFlow;
}

export async function saveRequestedAmount(flowId: string, requestedAmount: number): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const nextFlow = saveFlow({ ...flow, requestedAmount, currentStep: "documentos" });
  await addPublicEvent(nextFlow, "monto_solicitado_capturado", "Monto solicitado capturado", "monto", {
    requested_amount: requestedAmount,
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
  const nextFlow = saveFlow({
    ...flow,
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
        document.id === "ine_aval" || document.id === "comprobante_domicilio_aval"
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
        document.id === "garantia" ? { ...document, file: undefined, status: "missing" as const } : document,
      );
  return saveFlow({ ...flow, hasCollateral, documents });
}

export async function sendPhoneVerificationCode(flowId: string, eventName = "sms_enviado"): Promise<SolicitudFlowState> {
  await wait(650);
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");

  const phoneVerification = phoneVerificationForPhone(flow.basicData.phone, flow.phoneVerification);
  if (phoneVerification.phone.length !== 10) {
    throw new Error("Necesitamos tu número celular para enviarte el código.");
  }

  const nextFlow = saveFlow({
    ...flow,
    currentStep: "phone_verification",
    phoneVerification: {
      ...phoneVerification,
      codeSent: true,
      codeVerified: false,
      sentAt: new Date().toISOString(),
    },
    phoneVerified: false,
    phoneVerifiedAt: undefined,
  });
  await addPublicEvent(nextFlow, eventName, eventName === "otp_reenviado" ? "Código reenviado" : "Código enviado", "phone_verification", {
    eventName,
    maskedPhone: nextFlow.phoneVerification.maskedPhone,
    attempts: nextFlow.phoneVerification.attempts,
  });
  return nextFlow;
}

export async function verifyPhoneCode(flowId: string, code: string): Promise<SolicitudFlowState> {
  await wait(650);
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");

  const phoneVerification = phoneVerificationForPhone(flow.basicData.phone, flow.phoneVerification);
  if (phoneVerification.phone.length !== 10) {
    throw new Error("Necesitamos tu número celular para enviarte el código.");
  }

  const attempts = phoneVerification.attempts + 1;
  const verified = code === DEMO_OTP_CODE;
  const nextFlow = saveFlow({
    ...flow,
    currentStep: "phone_verification",
    phoneVerification: {
      ...phoneVerification,
      codeSent: true,
      codeVerified: verified,
      attempts,
      verifiedAt: verified ? new Date().toISOString() : phoneVerification.verifiedAt,
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

  return nextFlow;
}

export async function acceptAuthorization(flowId: string, accepted: boolean): Promise<SolicitudFlowState> {
  await wait();
  const flow = readStore().find((item) => item.flowId === flowId);
  if (!flow) throw new Error("No encontramos esta solicitud.");
  const nextFlow = saveFlow({ ...flow, authorizationAccepted: accepted, currentStep: accepted ? "resumen" : "autorizacion" });
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
  if ((flow.applicantKind === "physical" || flow.applicantKind === "company") && !flow.phoneVerified) {
    throw new Error("Necesitamos confirmar tu celular antes de enviar la solicitud.");
  }
  if (!flow.authorizationAccepted) throw new Error("Necesitamos tu autorización para continuar con la solicitud.");

  const documentsComplete = areRequiredDocumentsComplete(flow.documents, {
    hasGuarantor: flow.hasGuarantor,
    hasCollateral: flow.hasCollateral,
    ineLoaded: Boolean(flow.ineFront && flow.ineBack),
  });
  const bureauInput = simulatedBureauInput(flow);
  const personType = personTypeFromKind(flow.applicantKind);
  const demoBureauInput = resolveDemoCreditScenario(flow.demoCreditScenario ?? null, personType);
  const evaluationInput = demoBureauInput ?? bureauInput;
  const creditEvaluation = evaluateCreditByPersonType(
    { personType },
    {
      bureauHasHit: evaluationInput.bureauHasHit,
      bureauScore: evaluationInput.bureauScore,
      documentsComplete,
    },
  );
  const publicCreditResult = getPublicCreditResult(creditEvaluation);

  let nextFlow = flow;
  if (!flow.application_id) {
    const application = await createApplication(buildApplicationPayload(flow));
    await linkTraceApplication(flow.trace_id, application.id);
    const flowWithEvaluation = {
      ...flow,
      application_id: application.id,
      folio: application.folio,
      creditEvaluation,
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
      documentsComplete,
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
      folio: application.folio,
      currentStep: "final",
      submittedAt: new Date().toISOString(),
    };
  } else {
    const existingApplication = await getApplicationById(flow.application_id);
    if (!existingApplication) throw new Error("Solicitud no encontrada.");
    const flowWithEvaluation = {
      ...flow,
      creditEvaluation,
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
      documentsComplete,
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
      folio: flow.folio ?? application.folio,
      creditEvaluation,
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
