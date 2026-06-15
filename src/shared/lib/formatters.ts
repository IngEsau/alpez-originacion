import type {
  ApplicationDecision,
  ApplicationScenario,
  ApplicationStatus,
  DocumentStatus,
  PersonType,
  RejectionReason,
  RiskLevel,
  ValidationStatus,
} from "../../features/applications/types/application.types";
import type { TraceStatus, TraceStep } from "../../features/traces/types/trace.types";

export const moneyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number | null): string {
  return value === null ? "Pendiente" : `${moneyFormatter.format(value)} MXN`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export const personTypeLabels: Record<PersonType, string> = {
  fisica: "Persona Física",
  moral: "Persona Moral",
};

export const scenarioLabels: Record<ApplicationScenario, string> = {
  persona_fisica_hit_buro: "PF · Hit Buró",
  persona_moral_hit_buro: "PM · Hit Buró",
  persona_moral_no_hit_buro: "PM · Sin hit Buró",
};

export const fullScenarioLabels: Record<ApplicationScenario, string> = {
  persona_fisica_hit_buro: "Persona Física con hit Buró",
  persona_moral_hit_buro: "Persona Moral con hit Buró",
  persona_moral_no_hit_buro: "Persona Moral sin hit Buró",
};

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  nueva: "Nueva",
  captura_datos: "Captura de datos",
  validacion_ine: "Validación INE",
  documentos_pendientes: "Documentos pendientes",
  documentos_revision: "Documentos en revisión",
  sms_pendiente: "SMS pendiente",
  consulta_buro: "Consulta Buró",
  validacion_listas: "Validación listas",
  modelo_decision: "Modelo decisión",
  analisis_credito: "Análisis crédito",
  investigacion_legal: "Investigación legal",
  contratos: "Contratos",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

export const applicationDecisionLabels: Record<ApplicationDecision, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  observada: "Observada",
};

export const riskLabels: Record<RiskLevel, string> = {
  alto: "Alto",
  medio: "Medio",
  bajo: "Bajo",
  no_aplica: "No aplica",
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
  pendiente: "Pendiente",
  cargado: "Cargado",
  en_revision: "En revisión",
  validado: "Validado",
  rechazado: "Rechazado",
};

export const validationStatusLabels: Record<ValidationStatus, string> = {
  pendiente: "Pendiente",
  procesando: "Procesando",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  observado: "Observado",
};

export const rejectionReasonLabels: Record<RejectionReason, string> = {
  ine_vencida: "INE vencida",
  ine_calidad_baja: "Calidad de INE baja",
  ine_no_encontrada: "INE no encontrada en padrón",
  rechazo_knockouts: "Reglas knockout",
  cliente_existente: "Cliente existente",
  documentos_incompletos: "Documentos incompletos",
  sin_historial_crediticio: "Sin historial crediticio",
  score_insuficiente: "Score insuficiente",
  validacion_listas_rechazada: "Validación de listas rechazada",
  analisis_credito_rechazado: "Análisis de crédito rechazado",
  modelo_decision_rechazado: "Modelo de decisión rechazado",
  no_aplica: "No aplica",
};

export const traceStatusLabels: Record<TraceStatus, string> = {
  running: "En proceso",
  completed: "Completada",
  failed: "Fallida",
  rejected: "Rechazada",
};

export const traceStepLabels: Record<TraceStep, string> = {
  originacion_iniciada: "Originación iniciada",
  ine_carga: "Carga INE",
  ine_validacion_calidad: "Validación calidad INE",
  ine_validacion_vigencia: "Validación vigencia INE",
  ine_validacion_padron: "Validación padrón",
  knockouts: "Knockouts",
  captura_datos: "Captura de datos",
  documentos: "Documentos",
  buro: "Buró",
  listas: "Listas",
  decision: "Decisión",
  finalizado: "Finalizado",
};

export function formatScore(bureauScore: number | null, finalScore: number | null): string {
  if (bureauScore !== null) return String(bureauScore);
  if (finalScore !== null) return `Score final: ${finalScore}`;
  return "N/A";
}

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
