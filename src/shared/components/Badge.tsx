import type {
  ApplicationDecision,
  ApplicationScenario,
  ApplicationStatus,
  DocumentStatus,
  RiskLevel,
  ValidationStatus,
} from "../../features/applications/types/application.types";
import type { TraceEventStatus, TraceStatus } from "../../features/traces/types/trace.types";
import {
  applicationDecisionLabels,
  applicationStatusLabels,
  documentStatusLabels,
  riskLabels,
  scenarioLabels,
  validationStatusLabels,
  traceStatusLabels,
  cx,
} from "../lib/formatters";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  success: "bg-green-50 text-green-700 ring-green-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
};

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<ApplicationStatus, BadgeTone> = {
  nueva: "neutral",
  captura_datos: "info",
  validacion_ine: "info",
  documentos_pendientes: "warning",
  documentos_revision: "warning",
  sms_pendiente: "warning",
  consulta_buro: "info",
  validacion_listas: "info",
  modelo_decision: "info",
  analisis_credito: "warning",
  investigacion_legal: "info",
  contratos: "success",
  aprobada: "success",
  rechazada: "danger",
};

const decisionTone: Record<ApplicationDecision, BadgeTone> = {
  pendiente: "neutral",
  aprobada: "success",
  rechazada: "danger",
  observada: "warning",
};

const documentTone: Record<DocumentStatus, BadgeTone> = {
  pendiente: "neutral",
  cargado: "info",
  en_revision: "warning",
  validado: "success",
  rechazado: "danger",
};

const validationTone: Record<ValidationStatus, BadgeTone> = {
  pendiente: "neutral",
  procesando: "info",
  aprobado: "success",
  rechazado: "danger",
  observado: "warning",
};

const riskTone: Record<RiskLevel, BadgeTone> = {
  alto: "warning",
  medio: "info",
  bajo: "success",
  no_aplica: "neutral",
};

const traceTone: Record<TraceStatus, BadgeTone> = {
  running: "info",
  completed: "success",
  failed: "warning",
  rejected: "danger",
};

const traceEventTone: Record<TraceEventStatus, BadgeTone> = {
  pending: "neutral",
  running: "info",
  success: "success",
  warning: "warning",
  error: "danger",
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge tone={statusTone[status]}>{applicationStatusLabels[status]}</Badge>;
}

export function ApplicationDecisionBadge({ decision }: { decision: ApplicationDecision }) {
  return <Badge tone={decisionTone[decision]}>{applicationDecisionLabels[decision]}</Badge>;
}

export function ApplicationScenarioBadge({ scenario }: { scenario: ApplicationScenario }) {
  return <Badge tone={scenario === "persona_moral_no_hit_buro" ? "warning" : "info"}>{scenarioLabels[scenario]}</Badge>;
}

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <Badge tone={documentTone[status]}>{documentStatusLabels[status]}</Badge>;
}

export function ValidationStatusBadge({ status }: { status: ValidationStatus }) {
  return <Badge tone={validationTone[status]}>{validationStatusLabels[status]}</Badge>;
}

export function RiskBadge({ riskLevel }: { riskLevel: RiskLevel }) {
  return <Badge tone={riskTone[riskLevel]}>{riskLabels[riskLevel]}</Badge>;
}

export function TraceStatusBadge({ status }: { status: TraceStatus }) {
  return <Badge tone={traceTone[status]}>{traceStatusLabels[status]}</Badge>;
}

export function TraceEventStatusBadge({ status }: { status: TraceEventStatus }) {
  const labels: Record<TraceEventStatus, string> = {
    pending: "Pendiente",
    running: "En proceso",
    success: "Correcto",
    warning: "Observado",
    error: "Error",
  };
  return <Badge tone={traceEventTone[status]}>{labels[status]}</Badge>;
}
