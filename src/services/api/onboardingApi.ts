import { ApiRequestError, apiRequest } from "../http/httpClient";
import type {
  AddressCatalogResult,
  ApiEnvelope,
  ConsultBureauPayload,
  ConsultBureauResult,
  RequiredDocumentsResult,
  SaveBusinessDataPayload,
  SaveCreditDataPayload,
  SaveGeneralDataPayload,
  SendSmsPayload,
  SendSmsResult,
  StartOnboardingPayload,
  StartOnboardingResult,
  StatesCatalogResult,
  OnboardingStepResult,
  UploadDocumentResult,
  UploadOnboardingDocumentPayload,
  ValidateRfcPayload,
  ValidateRfcResult,
  ValidateSmsPayload,
  ValidateSmsResult,
} from "./onboarding.types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

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

export function validateRfc(payload: ValidateRfcPayload): Promise<ValidateRfcResult> {
  return postEnvelope<ValidateRfcPayload, ValidateRfcResult>("/v1/onboarding/validar-rfc", payload);
}

export function saveBusinessData(payload: SaveBusinessDataPayload): Promise<OnboardingStepResult> {
  return postEnvelope<SaveBusinessDataPayload, OnboardingStepResult>("/v1/onboarding/negocio", payload);
}

export function saveCreditData(payload: SaveCreditDataPayload): Promise<OnboardingStepResult> {
  return postEnvelope<SaveCreditDataPayload, OnboardingStepResult>("/v1/onboarding/credito", payload);
}

export function mapConsultBureauResponse(response: unknown): ConsultBureauResult {
  const envelope = asRecord(response);
  const data = asRecord(envelope?.data);
  const approved = data?.aprobado_preliminar;

  if (approved !== true && approved !== false) {
    throw new Error("Respuesta de evaluación inválida.");
  }

  const score = data?.score;
  const folio = data?.folio;
  const status = data?.estatus_seguimiento;
  const message = envelope?.mensaje ?? envelope?.message;

  return {
    aprobadoPreliminar: approved,
    ...(typeof score === "number" ? { score } : {}),
    ...(typeof folio === "string" && folio.trim() ? { folio } : {}),
    ...(typeof status === "string" && status.trim() ? { estatusSeguimiento: status } : {}),
    ...(typeof message === "string" && message.trim() ? { mensaje: message } : {}),
  };
}

export function consultBureau(payload: ConsultBureauPayload): Promise<ConsultBureauResult> {
  return apiRequest<ApiEnvelope<unknown>>("/v1/onboarding/consultar-buro", {
    method: "POST",
    body: JSON.stringify(payload),
  }).then(mapConsultBureauResponse);
}

export function getRequiredDocuments(traceId: string): Promise<RequiredDocumentsResult> {
  return postEnvelope<{ trace_id: string }, RequiredDocumentsResult>("/v1/onboarding/lista-documentos", {
    trace_id: traceId,
  });
}

export function uploadOnboardingDocument(payload: UploadOnboardingDocumentPayload): Promise<UploadDocumentResult> {
  return postEnvelope<UploadOnboardingDocumentPayload, UploadDocumentResult>("/v1/onboarding/expediente-documento", payload);
}

export function sendSms(payload: SendSmsPayload): Promise<SendSmsResult> {
  return postEnvelope<SendSmsPayload, SendSmsResult>("/v1/onboarding/enviar-sms", payload);
}

function smsValidationFromBusinessError(error: unknown): ValidateSmsResult | null {
  const status = error instanceof ApiRequestError
    ? error.status
    : error && typeof error === "object" && typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : null;
  if (status !== 422) return null;
  const body = error instanceof ApiRequestError
    ? error.body
    : error && typeof error === "object"
      ? (error as { body?: unknown }).body
      : undefined;
  const envelope = body && typeof body === "object" ? body as Partial<ApiEnvelope<ValidateSmsResult>> : null;
  const data = envelope?.data && typeof envelope.data === "object" ? envelope.data : undefined;
  return {
    valid: false,
    ...(typeof data?.etapa_actual === "string" ? { etapa_actual: data.etapa_actual } : {}),
    message: envelope?.message ?? envelope?.mensaje ?? "El código no coincide. Revisa los dígitos e inténtalo de nuevo.",
  };
}

export function mapValidateSmsResponse(response: unknown): ValidateSmsResult {
  const envelope = asRecord(response);
  const data = asRecord(envelope?.data);
  const valid = data?.valid;
  const message = envelope?.message ?? envelope?.mensaje;
  const responseCode = Number(envelope?.code);

  if (envelope?.success === false && responseCode !== 422) {
    throw new Error(typeof message === "string" && message.trim() ? message : "No pudimos confirmar el código.");
  }

  if (valid !== true && valid !== false) {
    throw new Error("Respuesta de verificación inválida.");
  }

  return {
    valid,
    ...(typeof data?.etapa_actual === "string" ? { etapa_actual: data.etapa_actual } : {}),
    ...(typeof message === "string" && message.trim() ? { message } : {}),
  };
}

export async function validateSms(payload: ValidateSmsPayload): Promise<ValidateSmsResult> {
  try {
    const response = await apiRequest<ApiEnvelope<ValidateSmsResult>>("/v1/onboarding/validar-sms", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return mapValidateSmsResponse(response);
  } catch (error) {
    const businessResult = smsValidationFromBusinessError(error);
    if (businessResult) return businessResult;
    throw error;
  }
}

export function getAddressByZipCode(cp: string): Promise<AddressCatalogResult> {
  return apiRequest<ApiEnvelope<AddressCatalogResult>>(`/v1/onboarding/codigo-postal?cp=${encodeURIComponent(cp)}`)
    .then(normalizeApiEnvelope);
}

export function getStates(): Promise<StatesCatalogResult> {
  return apiRequest<ApiEnvelope<StatesCatalogResult>>("/v1/onboarding/estados").then(normalizeApiEnvelope);
}
