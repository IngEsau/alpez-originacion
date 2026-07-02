import { VALIDATION_LABELS } from "../../../mocks/catalogs.mock";
import { calculateDocumentSummary } from "../../applications/utils/workflowState";
import type {
  Application,
  ValidationEvent,
  ValidationEventName,
  ValidationStatus,
  ValidationSummaryItem,
  ValidationType,
} from "../../applications/types/application.types";

const validationOrder: ValidationType[] = [
  "ine",
  "knockouts",
  "cliente_existente",
  "sms",
  "documentos",
  "buro",
  "listas",
  "modelo_decision",
  "investigacion_legal",
  "contratos",
];

const eventByValidation: Partial<Record<ValidationType, ValidationEventName>> = {
  ine: "ine_validation_completed",
  knockouts: "knockouts_completed",
  cliente_existente: "existing_client_validation_completed",
  sms: "otp_verified",
  buro: "bureau_query_completed",
  listas: "lists_validation_completed",
  modelo_decision: "decision_model_completed",
};

function hasIneDocuments(application: Application): boolean {
  return application.documents.some((document) =>
    ["ine_titular", "ine_representante_legal"].includes(document.type) &&
    Boolean(document.fileName || document.uploadedAt),
  );
}

function mapValidationStatus(status: ValidationStatus): ValidationSummaryItem["status"] {
  if (status === "aprobado") return "completed";
  if (status === "rechazado") return "rejected";
  if (status === "observado") return "observed";
  return "pending";
}

function eventMap(events: ValidationEvent[] = []): Map<ValidationEventName, ValidationEvent> {
  return new Map(events.map((event) => [event.name, event]));
}

export function backfillValidationEvents(application: Application): ValidationEvent[] {
  const now = application.updatedAt;
  const existing = application.validationEvents ?? [];
  const seen = new Set(existing.map((event) => event.name));
  const events: ValidationEvent[] = [...existing];

  function add(name: ValidationEventName, detail: string) {
    if (seen.has(name)) return;
    seen.add(name);
    events.push({ name, completedAt: now, source: "backfill", detail });
  }

  if (hasIneDocuments(application)) {
    add("ine_uploaded", "INE cargada desde canal autoasistido.");
    add("ine_validation_completed", "Revisión inicial de INE completada.");
  }
  if (application.otpVerified) add("otp_verified", "OTP verificado en canal autoasistido.");
  if (application.creditEvaluation || application.bureauScore !== null) {
    add("bureau_query_completed", "Consulta de historial registrada.");
  }
  if (application.creditEvaluation || application.decisionResult) {
    add("decision_model_completed", "Evaluación de crédito registrada.");
  }
  if (application.creditEvaluation?.publicDecision === "approved" || application.decision === "aprobada") {
    add("knockouts_completed", "Validaciones iniciales completadas.");
    add("existing_client_validation_completed", "Cliente existente validado.");
    add("lists_validation_completed", "Validación de listas registrada.");
  }

  return events;
}

export function deriveValidationSummary(application: Application): ValidationSummaryItem[] {
  const events = eventMap(backfillValidationEvents(application));
  const savedByType = new Map(application.validations.map((validation) => [validation.type, validation]));
  const documentSummary = application.documentSummary ?? calculateDocumentSummary(application.documents);

  return validationOrder.map((type) => {
    const saved = savedByType.get(type);
    const event = eventByValidation[type] ? events.get(eventByValidation[type]) : undefined;
    const label = saved?.label ?? VALIDATION_LABELS[type] ?? type;

    if (type === "documentos") {
      if (documentSummary.complete) {
        return {
          type,
          label,
          status: "completed",
          detail: "Documentación requerida aprobada.",
        };
      }
      return {
        type,
        label,
        status: documentSummary.needsChange > 0 ? "observed" : "pending",
        detail: `Faltan ${documentSummary.missing}, por revisar ${documentSummary.pendingReview}, necesitan cambio ${documentSummary.needsChange}.`,
      };
    }

    if (type === "investigacion_legal") {
      if (application.legalReviewStatus === "approved") return { type, label, status: "completed", detail: "Investigación legal aprobada." };
      if (application.legalReviewStatus === "rejected") return { type, label, status: "rejected", detail: "Investigación legal rechazada." };
      if (application.legalReviewStatus === "in_progress") return { type, label, status: "pending", detail: "Investigación legal en curso." };
    }

    if (type === "contratos") {
      if (application.contractStatus === "signed") return { type, label, status: "completed", detail: "Contratos firmados." };
      if (application.contractStatus === "prepared" || application.contractStatus === "sent_for_signature") {
        return { type, label, status: "pending", detail: "Contratos preparados, pendientes de firma." };
      }
    }

    if (event) {
      const rejected = type === "buro" && application.creditEvaluation?.publicDecision === "rejected";
      return {
        type,
        label,
        status: rejected ? "rejected" : "completed",
        detail: event.detail ?? "Completada en canal autoasistido.",
        completedAt: event.completedAt,
        source: event.source,
      };
    }

    if (saved) {
      return {
        type,
        label,
        status: mapValidationStatus(saved.status),
        detail: saved.detail ?? saved.result ?? "Pendiente de ejecución.",
        completedAt: saved.completedAt,
        source: "agent_panel",
      };
    }

    return { type, label, status: "pending", detail: "Pendiente de ejecución." };
  });
}
