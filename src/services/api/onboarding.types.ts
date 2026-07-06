import type { ApplicantKind, StoredFile } from "../../features/solicitud/types/solicitud.types";

export interface ApiEnvelope<T> {
  code: number;
  success: boolean;
  trace_id: string | null;
  mensaje?: string;
  message?: string;
  data: T;
}

export interface StartOnboardingPayload {
  tipo_persona: "FISICA" | "MORAL";
  ine_frontal: string;
  ine_reverso: string;
}

export interface StartOnboardingResult {
  trace_id: string;
  message: string;
  ocr?: Record<string, unknown>;
}

export interface SaveGeneralDataPayload {
  trace_id: string;

  primer_nombre: string;
  segundo_nombre?: string;
  apellido_paterno: string;
  apellido_materno?: string;

  fecha_nacimiento: string;
  genero: "M" | "F" | "O";

  telefono: string;
  correo: string;

  estado_nacimiento_id: number;

  direccion: string;
  num_ext: string;
  num_int?: string;

  colonia_id: string;
  estado_id: string;
  municipio_id: string;
  codigo_postal: string;
}

export interface SaveBusinessDataPayload {
  trace_id: string;
  actividad_negocio: string;
  anios_operacion: number;
  ingresos_mensuales: number;
}

export interface SaveCreditDataPayload {
  trace_id: string;
  monto_solicitado: number;
}

export interface OnboardingStepResult {
  trace_id: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ValidateRfcPayload {
  trace_id: string;
  rfc: string;
  curp: string;
}

export interface ValidateRfcResult {
  etapa_actual?: string;
  validado?: boolean;
  rfc?: string;
  curp?: string;
}

export interface RequiredDocumentsPayload {
  trace_id: string;
}

export interface BackendRequiredDocument {
  id: string | number;
  clave: string;
  nombre: string;
  condicionado_a?: "NINGUNO" | "AVAL" | "GARANTIA" | string;
  requerido?: "0" | "1" | 0 | 1 | boolean;
  cargado?: boolean;
}

export interface RequiredDocumentsResult {
  solicitante: BackendRequiredDocument[];
  aval?: BackendRequiredDocument[];
  garantia?: BackendRequiredDocument[];
  progreso?: {
    total_requeridos?: number;
    total_cargados?: number;
    completado?: boolean;
  };
}

export interface OnboardingDocumentItem {
  id: string;
  backendDocumentId: string | number;
  key: string;
  label: string;
  status: "missing" | "uploaded" | "review_pending" | "approved" | "needs_change";
  fileName?: string;
  previewUrl?: string;
  required: boolean;
}

export interface UploadOnboardingDocumentPayload {
  trace_id: string;
  documento_id: string | number;
  archivo_base64: string;
}

export interface UploadDocumentResult {
  documento_id: string | number;
  clave?: string;
  etapa_actual?: string;
  completado?: boolean;
  telefono?: string;
  progreso?: {
    total_requeridos?: number;
    total_cargados?: number;
    completado?: boolean;
  };
}

export interface SendSmsPayload {
  trace_id: string;
}

export interface SendSmsResult {
  vigente_hasta?: string;
  message?: string;
}

export interface ValidateSmsPayload {
  trace_id: string;
  codigo: string;
}

export interface ValidateSmsResult {
  valid: boolean;
  etapa_actual?: string;
  message?: string;
}

export interface AddressCatalogResult {
  codigo_postal: string;
  estado: string;
  estado_id?: string;
  municipio: string;
  municipio_id?: string;
  colonias?: string[];
}

export interface StatesCatalogResult {
  estados: {
    id: string | number;
    nombre: string;
  }[];
}

export interface StartOnboardingFlowInput {
  flowId: string;
  applicantKind: ApplicantKind;
  ineFront: StoredFile;
  ineBack: StoredFile;
}
