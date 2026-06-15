import type { Trace, TraceEvent, TraceEventStatus, TraceStep } from "../features/traces/types/trace.types";

function event(
  trace_id: string,
  step: TraceStep,
  title: string,
  description: string,
  status: TraceEventStatus,
  minutes: number,
  metadata?: Record<string, unknown>,
): TraceEvent {
  return {
    id: `${trace_id}_${step}_${minutes}`,
    trace_id,
    step,
    title,
    description,
    status,
    created_at: new Date(Date.UTC(2026, 5, 13, 14, minutes)).toISOString(),
    metadata,
  };
}

export const TRACES_MOCK: Trace[] = [
  {
    trace_id: "TRC-20260613-0001",
    application_id: "app_003",
    person_type: "fisica",
    current_step: "captura_datos",
    status: "running",
    ine_front_loaded: true,
    ine_back_loaded: true,
    created_at: "2026-06-13T14:00:00.000Z",
    updated_at: "2026-06-13T14:18:00.000Z",
    events: [
      event("TRC-20260613-0001", "originacion_iniciada", "Originación iniciada", "Se creó la traza de originación.", "success", 0),
      event("TRC-20260613-0001", "ine_carga", "Carga frontal INE simulada", "Archivo frontal_ine.jpg cargado.", "success", 3),
      event("TRC-20260613-0001", "ine_carga", "Carga reverso INE simulada", "Archivo reverso_ine.jpg cargado.", "success", 5),
      event("TRC-20260613-0001", "ine_carga", "Documentos INE listos para validación", "Frontal y reverso listos.", "success", 6),
      event("TRC-20260613-0001", "ine_validacion_padron", "INE aprobada", "Calidad, vigencia y padrón aprobados.", "success", 10, {
        status: "approved",
      }),
      event("TRC-20260613-0001", "knockouts", "Knockouts aprobados", "Sin reglas eliminatorias detectadas.", "success", 13),
      event("TRC-20260613-0001", "captura_datos", "Captura habilitada", "Se ligó una solicitud para continuar.", "success", 18, {
        application_id: "app_003",
      }),
    ],
  },
  {
    trace_id: "TRC-20260613-0002",
    person_type: "fisica",
    current_step: "ine_validacion_vigencia",
    status: "rejected",
    ine_front_loaded: true,
    ine_back_loaded: true,
    created_at: "2026-06-13T14:10:00.000Z",
    updated_at: "2026-06-13T14:21:00.000Z",
    events: [
      event("TRC-20260613-0002", "originacion_iniciada", "Originación iniciada", "Se creó la traza de originación.", "success", 10),
      event("TRC-20260613-0002", "ine_carga", "Documentos INE listos para validación", "Frontal y reverso cargados.", "success", 14),
      event("TRC-20260613-0002", "ine_validacion_vigencia", "INE rechazada", "La INE se encuentra vencida.", "error", 21, {
        rejection_reason: "expired",
      }),
    ],
  },
  {
    trace_id: "TRC-20260613-0003",
    person_type: "moral",
    current_step: "ine_validacion_calidad",
    status: "failed",
    ine_front_loaded: true,
    ine_back_loaded: false,
    created_at: "2026-06-13T14:20:00.000Z",
    updated_at: "2026-06-13T14:30:00.000Z",
    events: [
      event("TRC-20260613-0003", "originacion_iniciada", "Originación iniciada", "Se creó la traza de originación.", "success", 20),
      event("TRC-20260613-0003", "ine_carga", "Carga frontal INE simulada", "Archivo frontal_ine.jpg cargado.", "success", 23),
      event("TRC-20260613-0003", "ine_validacion_calidad", "INE observada", "La imagen no tiene calidad suficiente.", "warning", 30, {
        rejection_reason: "low_quality",
      }),
    ],
  },
  {
    trace_id: "TRC-20260613-0004",
    person_type: "fisica",
    current_step: "ine_validacion_padron",
    status: "rejected",
    ine_front_loaded: true,
    ine_back_loaded: true,
    created_at: "2026-06-13T14:30:00.000Z",
    updated_at: "2026-06-13T14:40:00.000Z",
    events: [
      event("TRC-20260613-0004", "originacion_iniciada", "Originación iniciada", "Se creó la traza de originación.", "success", 30),
      event("TRC-20260613-0004", "ine_carga", "Documentos INE listos para validación", "Frontal y reverso cargados.", "success", 34),
      event("TRC-20260613-0004", "ine_validacion_padron", "INE rechazada", "No fue posible validar existencia en padrón.", "error", 40, {
        rejection_reason: "not_found_registry",
      }),
    ],
  },
  {
    trace_id: "TRC-20260613-0005",
    person_type: "moral",
    current_step: "knockouts",
    status: "rejected",
    ine_front_loaded: true,
    ine_back_loaded: true,
    created_at: "2026-06-13T14:40:00.000Z",
    updated_at: "2026-06-13T14:54:00.000Z",
    events: [
      event("TRC-20260613-0005", "originacion_iniciada", "Originación iniciada", "Se creó la traza de originación.", "success", 40),
      event("TRC-20260613-0005", "ine_carga", "Documentos INE listos para validación", "Frontal y reverso cargados.", "success", 43),
      event("TRC-20260613-0005", "ine_validacion_padron", "INE aprobada", "Calidad, vigencia y padrón aprobados.", "success", 48),
      event("TRC-20260613-0005", "knockouts", "Knockouts rechazados", "Actividad no permitida.", "error", 54, {
        reasons: ["Actividad no permitida"],
      }),
    ],
  },
  {
    trace_id: "TRC-20260613-0006",
    application_id: "app_001",
    person_type: "fisica",
    current_step: "finalizado",
    status: "completed",
    ine_front_loaded: true,
    ine_back_loaded: true,
    created_at: "2026-06-13T15:00:00.000Z",
    updated_at: "2026-06-13T15:35:00.000Z",
    events: [
      event("TRC-20260613-0006", "originacion_iniciada", "Originación iniciada", "Se creó la traza de originación.", "success", 0),
      event("TRC-20260613-0006", "ine_carga", "Documentos INE listos para validación", "Frontal y reverso cargados.", "success", 4),
      event("TRC-20260613-0006", "ine_validacion_padron", "INE aprobada", "Calidad, vigencia y padrón aprobados.", "success", 8),
      event("TRC-20260613-0006", "knockouts", "Knockouts aprobados", "Sin reglas eliminatorias detectadas.", "success", 10),
      event("TRC-20260613-0006", "decision", "Solicitud aprobada", "Modelo de decisión aprobado.", "success", 32, {
        application_id: "app_001",
      }),
      event("TRC-20260613-0006", "finalizado", "Originación finalizada", "Solicitud lista para contratos.", "success", 35),
    ],
  },
];
