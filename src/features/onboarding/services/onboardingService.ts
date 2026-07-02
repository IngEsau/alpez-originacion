import type { DocumentType } from "../../applications/types/application.types";
import type { ApplicantKind, SolicitudDocument, StoredFile } from "../../solicitud/types/solicitud.types";
import {
  getAddressByZipCode,
  getRequiredDocuments,
  getStates,
  saveBusinessData,
  saveCreditData,
  saveGeneralData,
  startOnboarding,
  uploadOnboardingDocument,
} from "../../../services/api/onboardingApi";
import type {
  AddressCatalogResult,
  BackendRequiredDocument,
  OnboardingStepResult,
  RequiredDocumentsResult,
  SaveBusinessDataPayload,
  SaveCreditDataPayload,
  SaveGeneralDataPayload,
  StartOnboardingFlowInput,
  StartOnboardingResult,
  StatesCatalogResult,
  UploadDocumentResult,
} from "../../../services/api/onboarding.types";

export function isRealApiEnabled(value = import.meta.env.VITE_USE_REAL_API): boolean {
  return value === "true";
}

export function isApiFallbackEnabled(value = import.meta.env.VITE_API_FALLBACK_TO_MOCK): boolean {
  return value === "true";
}

export const USE_REAL_API = isRealApiEnabled();
export const API_FALLBACK_TO_MOCK = isApiFallbackEnabled();

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
  return "No pudimos guardar este paso. Intenta nuevamente.";
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
    if (input.fallbackToMock) {
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
  return knownDocumentTypes.has(key as DocumentType) ? (key as DocumentType) : "constancia_situacion_fiscal";
}

export function mapBackendDocument(document: BackendRequiredDocument, group: "solicitante" | "aval" | "garantia"): SolicitudDocument {
  return {
    id: `${group}_${String(document.id)}`,
    backendDocumentId: document.id,
    backendKey: document.clave,
    label: document.nombre,
    applicationType: documentTypeFromBackendKey(document.clave),
    status: "missing",
    optional: document.requerido === false,
  };
}

export function mapBackendDocumentsToSolicitudDocuments(result: RequiredDocumentsResult): SolicitudDocument[] {
  return [
    ...result.solicitante.map((document) => mapBackendDocument(document, "solicitante")),
    ...(result.aval ?? []).map((document) => mapBackendDocument(document, "aval")),
    ...(result.garantia ?? []).map((document) => mapBackendDocument(document, "garantia")),
  ];
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
    () => ({ trace_id: payload.trace_id, message: "Datos guardados." }),
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

export async function loadRequiredDocuments(traceId: string, fallbackDocuments: SolicitudDocument[]): Promise<SolicitudDocument[]> {
  return withApiFallback(
    "getRequiredDocuments",
    async () => mapBackendDocumentsToSolicitudDocuments(await getRequiredDocuments(traceId)),
    () => fallbackDocuments,
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

export function getAddressCatalogByZipCode(cp: string): Promise<AddressCatalogResult> {
  return withApiFallback(
    "getAddressByZipCode",
    () => getAddressByZipCode(cp),
    () => ({ codigo_postal: cp, estado: "", municipio: "", colonias: [] }),
  );
}

export function getStateCatalog(): Promise<StatesCatalogResult> {
  return withApiFallback(
    "getStates",
    () => getStates(),
    () => ({ estados: [] }),
  );
}
