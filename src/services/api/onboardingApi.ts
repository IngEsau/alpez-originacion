import { apiRequest } from "../http/httpClient";
import type {
  AddressCatalogResult,
  ApiEnvelope,
  RequiredDocumentsResult,
  SaveBusinessDataPayload,
  SaveCreditDataPayload,
  SaveGeneralDataPayload,
  StartOnboardingPayload,
  StartOnboardingResult,
  StatesCatalogResult,
  OnboardingStepResult,
  UploadDocumentResult,
  UploadOnboardingDocumentPayload,
} from "./onboarding.types";

export function normalizeApiEnvelope<T>(envelope: ApiEnvelope<T>): T & { trace_id?: string; message?: string } {
  const message = envelope.message ?? envelope.mensaje ?? "";
  if (!envelope.success) {
    throw new Error(message || "No pudimos completar la operación.");
  }
  const data = (envelope.data ?? {}) as T;
  if (data && typeof data === "object") {
    const dataTraceId = (data as Record<string, unknown>).trace_id;
    return {
      ...data,
      trace_id: typeof dataTraceId === "string" ? dataTraceId : envelope.trace_id ?? undefined,
      message,
    };
  }
  return {
    data,
    trace_id: envelope.trace_id ?? undefined,
    message,
  } as unknown as T & { trace_id?: string; message?: string };
}

function postEnvelope<TPayload, TResult>(path: string, payload: TPayload): Promise<TResult> {
  return apiRequest<ApiEnvelope<TResult>>(path, {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(normalizeApiEnvelope);
}

export function startOnboarding(payload: StartOnboardingPayload): Promise<StartOnboardingResult> {
  return postEnvelope<StartOnboardingPayload, StartOnboardingResult>("/v1/onboarding/iniciar", payload);
}

export function saveGeneralData(payload: SaveGeneralDataPayload): Promise<OnboardingStepResult> {
  return postEnvelope<SaveGeneralDataPayload, OnboardingStepResult>("/v1/onboarding/datos-generales", payload);
}

export function saveBusinessData(payload: SaveBusinessDataPayload): Promise<OnboardingStepResult> {
  return postEnvelope<SaveBusinessDataPayload, OnboardingStepResult>("/v1/onboarding/negocio", payload);
}

export function saveCreditData(payload: SaveCreditDataPayload): Promise<OnboardingStepResult> {
  return postEnvelope<SaveCreditDataPayload, OnboardingStepResult>("/v1/onboarding/credito", payload);
}

export function getRequiredDocuments(traceId: string): Promise<RequiredDocumentsResult> {
  return postEnvelope<{ trace_id: string }, RequiredDocumentsResult>("/v1/onboarding/lista-documentos", {
    trace_id: traceId,
  });
}

export function uploadOnboardingDocument(payload: UploadOnboardingDocumentPayload): Promise<UploadDocumentResult> {
  return postEnvelope<UploadOnboardingDocumentPayload, UploadDocumentResult>("/v1/onboarding/expediente-documento", payload);
}

export function getAddressByZipCode(cp: string): Promise<AddressCatalogResult> {
  return apiRequest<ApiEnvelope<AddressCatalogResult>>(`/v1/onboarding/codigo-postal?cp=${encodeURIComponent(cp)}`)
    .then(normalizeApiEnvelope);
}

export function getStates(): Promise<StatesCatalogResult> {
  return apiRequest<ApiEnvelope<StatesCatalogResult>>("/v1/onboarding/estados").then(normalizeApiEnvelope);
}
