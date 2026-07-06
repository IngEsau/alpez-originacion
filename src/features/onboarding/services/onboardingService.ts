import type { DocumentType } from "../../applications/types/application.types";
import type { ApplicantKind, SolicitudDocument, StoredFile } from "../../solicitud/types/solicitud.types";
import { ApiRequestError } from "../../../services/http/httpClient";
import {
  getAddressByZipCode,
  getRequiredDocuments,
  getStates,
  saveBusinessData,
  saveCreditData,
  saveGeneralData,
  sendSms,
  startOnboarding,
  uploadOnboardingDocument,
  validateRfc,
  validateSms,
} from "../../../services/api/onboardingApi";
import type {
  AddressCatalogResult,
  BackendRequiredDocument,
  OnboardingStepResult,
  RequiredDocumentsResult,
  SaveBusinessDataPayload,
  SaveCreditDataPayload,
  SaveGeneralDataPayload,
  SendSmsResult,
  StartOnboardingFlowInput,
  StartOnboardingResult,
  StatesCatalogResult,
  UploadDocumentResult,
  ValidateRfcPayload,
  ValidateRfcResult,
  ValidateSmsResult,
} from "../../../services/api/onboarding.types";
import { FALLBACK_STATES } from "../../solicitud/utils/generalData";

export function isRealApiEnabled(value?: string): boolean {
  return value === "true";
}

export function isApiFallbackEnabled(value?: string): boolean {
  return value === "true";
}

export const USE_REAL_API = isRealApiEnabled(import.meta.env.VITE_USE_REAL_API);
export const API_FALLBACK_TO_MOCK = isApiFallbackEnabled(import.meta.env.VITE_API_FALLBACK_TO_MOCK);

type MockFallback<T> = () => T | Promise<T>;

function logApiFallback(operation: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[ALPEZ onboarding] ${operation} failed. Falling back to mock flow.`, error);
  }
}

function friendlyErrorMessage(operation: string): string {
  if (operation === "getRequiredDocuments") {
    return "No pudimos cargar la lista de documentos. Mostraremos una lista base para continuar.";
  }
  if (operation === "uploadDocument") {
    return "No pudimos subir el archivo. Intenta nuevamente.";
  }
  if (operation === "startOnboarding") {
    return "No pudimos iniciar la solicitud en este momento. Intenta nuevamente.";
  }
  if (operation === "saveGeneralData") {
    return "No pudimos guardar tus datos. Intenta nuevamente.";
  }
  if (operation === "validateRfc") {
    return "No pudimos validar estos datos. Revisa la información e intenta nuevamente.";
  }
  if (operation === "sendSms") {
    return "No pudimos enviar el código. Intenta nuevamente.";
  }
  if (operation === "validateSms") {
    return "No pudimos confirmar el código. Intenta nuevamente.";
  }
  return "No pudimos guardar este paso. Intenta nuevamente.";
}

function isTechnicalError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status === 0 || error.status >= 500;
  }
  return true;
}

export async function resolveApiOrMock<T>(input: {
  useRealApi: boolean;
  fallbackToMock: boolean;
  operation: string;
  apiCall: () => Promise<T>;
  fallback: MockFallback<T>;
  onFallback?: (operation: string, error: unknown) => void;
}): Promise<T> {
  if (!input.useRealApi) return input.fallback();
  try {
    return await input.apiCall();
  } catch (error) {
    if (input.fallbackToMock && isTechnicalError(error)) {
      input.onFallback?.(input.operation, error);
      return input.fallback();
    }
    if (import.meta.env.DEV) {
      console.error(`[ALPEZ onboarding] ${input.operation} failed.`, error);
    }
    throw new Error(friendlyErrorMessage(input.operation));
  }
}

async function withApiFallback<T>(
  operation: string,
  apiCall: () => Promise<T>,
  fallback: MockFallback<T>,
): Promise<T> {
  return resolveApiOrMock({
    useRealApi: USE_REAL_API,
    fallbackToMock: API_FALLBACK_TO_MOCK,
    operation,
    apiCall,
    fallback,
    onFallback: logApiFallback,
  });
}

function mockTraceId(flowId: string): string {
  return `MOCK-${flowId}`;
}

function mockFiscalIdentityFromGeneralPayload(payload: SaveGeneralDataPayload): { rfc?: string; curp?: string } {
  if (!payload.primer_nombre || !payload.apellido_paterno || !payload.fecha_nacimiento || !payload.genero) return {};
  const date = payload.fecha_nacimiento.replace(/-/g, "").slice(2);
  const first = payload.primer_nombre[0] ?? "X";
  const paternal = payload.apellido_paterno.slice(0, 2).padEnd(2, "X");
  const maternal = payload.apellido_materno?.[0] ?? "X";
  const base = `${paternal}${maternal}${first}${date}`.toUpperCase().replace(/Ñ/g, "X").replace(/[^A-Z0-9]/g, "X");
  const gender = payload.genero === "F" ? "M" : "H";
  return {
    rfc: `${base}XXX`.slice(0, 13),
    curp: `${base}${gender}${String(payload.estado_nacimiento_id).padStart(2, "0")}XXXA00`.slice(0, 18),
  };
}

const knownDocumentTypes = new Set<DocumentType>([
  "ine_titular",
  "curp",
  "constancia_situacion_fiscal",
  "comprobante_domicilio_titular",
  "comprobante_domicilio_negocio",
  "comprobante_domicilio_empresa",
  "comprobante_domicilio_representante",
  "ine_representante_legal",
  "opinion_positiva_sat",
  "estados_cuenta_bancarios",
  "declaracion_anual",
  "estados_financieros",
  "poder_representante_legal",
  "acta_constitutiva",
  "garantia",
  "ine_aval",
  "comprobante_domicilio_aval",
]);

function documentTypeFromBackendKey(key: string): DocumentType {
  const normalized = key.trim().toLowerCase();
  const mapped: Record<string, DocumentType> = {
    ine_frontal: "ine_titular",
    ine_reverso: "ine_titular",
    ine_titular_frontal: "ine_titular",
    ine_titular_reverso: "ine_titular",
    ine_representante_frontal: "ine_representante_legal",
    ine_representante_reverso: "ine_representante_legal",
    ine_representante_legal_frontal: "ine_representante_legal",
    ine_representante_legal_reverso: "ine_representante_legal",
    comprobante_domicilio: "comprobante_domicilio_titular",
    comprobante_domicilio_titular: "comprobante_domicilio_titular",
    comprobante_domicilio_negocio: "comprobante_domicilio_negocio",
    comprobante_domicilio_empresa: "comprobante_domicilio_empresa",
    comprobante_domicilio_representante: "comprobante_domicilio_representante",
    comprobante_domicilio_representante_legal: "comprobante_domicilio_representante",
    opinion_sat: "opinion_positiva_sat",
    opinion_positiva_sat: "opinion_positiva_sat",
    estados_cuenta: "estados_cuenta_bancarios",
    estados_cuenta_bancarios: "estados_cuenta_bancarios",
    declaracion_anual: "declaracion_anual",
    estados_financieros: "estados_financieros",
    poder_representante_legal: "poder_representante_legal",
    acta_constitutiva: "acta_constitutiva",
    ine_aval: "ine_aval",
    ine_aval_frontal: "ine_aval",
    ine_aval_reverso: "ine_aval",
    comprobante_domicilio_aval: "comprobante_domicilio_aval",
    documento_garantia: "garantia",
    garantia: "garantia",
    curp: "curp",
    constancia_situacion_fiscal: "constancia_situacion_fiscal",
  };
  if (mapped[normalized]) return mapped[normalized];
  return knownDocumentTypes.has(normalized as DocumentType) ? (normalized as DocumentType) : "constancia_situacion_fiscal";
}

function isBackendDocumentRequired(document: BackendRequiredDocument): boolean {
  return document.requerido === undefined || document.requerido === true || document.requerido === "1" || document.requerido === 1;
}

export interface LoadedRequiredDocumentsResult {
  documents: SolicitudDocument[];
  progress?: {
    totalRequired?: number;
    totalUploaded?: number;
    completed?: boolean;
  };
}

export interface MappedRequiredDocumentsResponse {
  holderDocuments: SolicitudDocument[];
  avalDocuments: SolicitudDocument[];
  guaranteeDocuments: SolicitudDocument[];
  progress?: LoadedRequiredDocumentsResult["progress"];
}

export function mapBackendDocument(document: BackendRequiredDocument, group: "solicitante" | "aval" | "garantia"): SolicitudDocument {
  const required = isBackendDocumentRequired(document);
  return {
    id: `${group}_${String(document.id)}`,
    backendDocumentId: document.id,
    backendKey: document.clave,
    backendCondition: document.condicionado_a,
    backendGroup: group,
    label: document.nombre,
    applicationType: documentTypeFromBackendKey(document.clave),
    status: document.cargado ? "uploaded" : "missing",
    optional: !required,
  };
}

export function mapBackendDocumentsToSolicitudDocuments(result: RequiredDocumentsResult): SolicitudDocument[] {
  return [
    ...result.solicitante.map((document) => mapBackendDocument(document, "solicitante")),
    ...(result.aval ?? []).map((document) => mapBackendDocument(document, "aval")),
    ...(result.garantia ?? []).map((document) => mapBackendDocument(document, "garantia")),
  ];
}

export function mapRequiredDocumentsResponse(result: RequiredDocumentsResult): MappedRequiredDocumentsResponse {
  const progress = result.progreso
    ? {
        totalRequired: result.progreso.total_requeridos,
        totalUploaded: result.progreso.total_cargados,
        completed: result.progreso.completado,
      }
    : undefined;

  return {
    holderDocuments: result.solicitante.map((document) => mapBackendDocument(document, "solicitante")),
    avalDocuments: (result.aval ?? []).map((document) => mapBackendDocument(document, "aval")),
    guaranteeDocuments: (result.garantia ?? []).map((document) => mapBackendDocument(document, "garantia")),
    progress,
  };
}

export function mapRequiredDocumentsResult(result: RequiredDocumentsResult): LoadedRequiredDocumentsResult {
  const mapped = mapRequiredDocumentsResponse(result);
  return {
    documents: [
      ...mapped.holderDocuments,
      ...mapped.avalDocuments,
      ...mapped.guaranteeDocuments,
    ],
    progress: mapped.progress,
  };
}

export async function startOnboardingFlow(input: StartOnboardingFlowInput): Promise<StartOnboardingResult> {
  return withApiFallback(
    "startOnboarding",
    () =>
      startOnboarding({
        tipo_persona: input.applicantKind === "company" ? "MORAL" : "FISICA",
        ine_frontal: input.ineFront.previewUrl ?? "",
        ine_reverso: input.ineBack.previewUrl ?? "",
      }),
    () => ({
      trace_id: mockTraceId(input.flowId),
      message: "Solicitud iniciada.",
    }),
  );
}

export async function saveOnboardingGeneralData(payload: SaveGeneralDataPayload): Promise<OnboardingStepResult> {
  return withApiFallback(
    "saveGeneralData",
    () => saveGeneralData(payload),
    () => ({ trace_id: payload.trace_id, message: "Datos guardados.", data: mockFiscalIdentityFromGeneralPayload(payload) }),
  );
}

export async function validateFiscalIdentityWithBackend(payload: ValidateRfcPayload): Promise<ValidateRfcResult> {
  return withApiFallback(
    "validateRfc",
    () => validateRfc(payload),
    () => ({ etapa_actual: "DATOS_NEGOCIO", validado: true, rfc: payload.rfc, curp: payload.curp }),
  );
}

export async function saveOnboardingBusinessData(payload: SaveBusinessDataPayload): Promise<OnboardingStepResult> {
  return withApiFallback(
    "saveBusinessData",
    () => saveBusinessData(payload),
    () => ({ trace_id: payload.trace_id, message: "Negocio guardado." }),
  );
}

export async function saveOnboardingCreditData(payload: SaveCreditDataPayload): Promise<OnboardingStepResult> {
  return withApiFallback(
    "saveCreditData",
    () => saveCreditData(payload),
    () => ({ trace_id: payload.trace_id, message: "Monto guardado." }),
  );
}

export async function loadRequiredDocuments(
  traceId: string,
  fallbackDocuments: SolicitudDocument[],
): Promise<LoadedRequiredDocumentsResult> {
  return withApiFallback(
    "getRequiredDocuments",
    async () => mapRequiredDocumentsResult(await getRequiredDocuments(traceId)),
    () => ({ documents: fallbackDocuments }),
  );
}

export async function uploadDocument(payload: {
  traceId: string;
  document: SolicitudDocument;
  file: StoredFile;
}): Promise<UploadDocumentResult> {
  return withApiFallback(
    "uploadDocument",
    () => {
      if (!payload.document.backendDocumentId) {
        throw new Error("Document is not linked to backend catalog.");
      }
      if (!payload.file.previewUrl) {
        throw new Error("File has no base64 preview.");
      }
      return uploadOnboardingDocument({
        trace_id: payload.traceId,
        documento_id: payload.document.backendDocumentId,
        archivo_base64: payload.file.previewUrl,
      });
    },
    () => ({
      documento_id: payload.document.backendDocumentId ?? payload.document.id,
    }),
  );
}

export async function sendOnboardingSms(traceId: string): Promise<SendSmsResult> {
  return withApiFallback(
    "sendSms",
    () => sendSms({ trace_id: traceId }),
    () => ({
      vigente_hasta: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      message: "Te enviamos un código por SMS.",
    }),
  );
}

export async function validateOnboardingSms(traceId: string, code: string): Promise<ValidateSmsResult> {
  return withApiFallback(
    "validateSms",
    () => validateSms({ trace_id: traceId, codigo: code }),
    () => ({ valid: code === "123456", etapa_actual: code === "123456" ? "AUTORIZACION" : "VERIFICACION_TELEFONICA" }),
  );
}

export function getAddressCatalogByZipCode(cp: string): Promise<AddressCatalogResult> {
  return withApiFallback(
    "getAddressByZipCode",
    () => getAddressByZipCode(cp),
    () => cp === "72595"
      ? {
          codigo_postal: cp,
          estado: "Puebla",
          estado_id: "21",
          municipio: "Puebla",
          municipio_id: "114",
          colonias: ["Artículo Primero", "San Francisco Totimehuacan"],
        }
      : { codigo_postal: cp, estado: "", municipio: "", colonias: [] },
  );
}

export function getStateCatalog(): Promise<StatesCatalogResult> {
  return withApiFallback(
    "getStates",
    () => getStates(),
    () => ({ estados: FALLBACK_STATES.map((state) => ({ id: state.id, nombre: state.name })) }),
  );
}
