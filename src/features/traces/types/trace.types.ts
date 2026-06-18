import type { PersonType } from "../../applications/types/application.types";

export type TraceStatus = "running" | "completed" | "failed" | "rejected";

export type TraceStep =
  | "originacion_iniciada"
  | "ine_carga"
  | "ine_validacion_calidad"
  | "ine_validacion_vigencia"
  | "ine_validacion_padron"
  | "knockouts"
  | "cliente_existente"
  | "captura_datos"
  | "documentos"
  | "buro"
  | "listas"
  | "decision"
  | "finalizado";

export type TraceEventStatus = "pending" | "running" | "success" | "warning" | "error";

export interface TraceEvent {
  id: string;
  trace_id: string;
  step: TraceStep;
  title: string;
  description: string;
  status: TraceEventStatus;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface Trace {
  trace_id: string;
  application_id?: string;
  person_type?: PersonType;
  current_step: TraceStep;
  status: TraceStatus;
  events: TraceEvent[];
  created_at: string;
  updated_at: string;
  ine_front_loaded?: boolean;
  ine_back_loaded?: boolean;
}

export interface CreateTracePayload {
  person_type?: PersonType;
}

export interface AddTraceEventPayload {
  step: TraceStep;
  title: string;
  description: string;
  status: TraceEventStatus;
  metadata?: Record<string, unknown>;
}

export interface IneInitialValidationResult {
  image_quality: "valid" | "invalid";
  is_expired: boolean;
  exists_in_registry: boolean;
  status: "approved" | "rejected" | "observed";
  rejection_reason?: "low_quality" | "expired" | "not_found_registry";
  message: string;
}

export interface KnockoutValidationResult {
  passed: boolean;
  reasons: string[];
  status: "approved" | "rejected";
  message: string;
}

export interface ExistingClientInitialValidationResult {
  exists: boolean;
  customer_id?: string;
  status: "approved" | "rejected";
  message: string;
}
