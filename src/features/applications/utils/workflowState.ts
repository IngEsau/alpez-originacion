import type {
  ContractStatus,
  CreditEvaluation,
  DocumentItem,
  DocumentSummary,
  InternalWorkflowState,
  LegalReviewStatus,
} from "../types/application.types";

function hasFile(document: DocumentItem): boolean {
  return Boolean(document.fileName || document.uploadedAt);
}

export function calculateDocumentSummary(documents: DocumentItem[]): DocumentSummary {
  const requiredDocuments = documents.filter((document) => document.required);
  const summary = requiredDocuments.reduce<DocumentSummary>(
    (current, document) => {
      if (document.status === "validado") {
        current.approved += 1;
        return current;
      }

      if (document.status === "rechazado") {
        current.needsChange += 1;
        return current;
      }

      if (document.status === "en_revision") {
        current.pendingReview += 1;
        return current;
      }

      if (document.status === "cargado" || hasFile(document)) {
        current.uploaded += 1;
        current.pendingReview += 1;
        return current;
      }

      current.missing += 1;
      return current;
    },
    {
      totalRequired: requiredDocuments.length,
      missing: 0,
      uploaded: 0,
      pendingReview: 0,
      approved: 0,
      needsChange: 0,
      complete: false,
    },
  );

  summary.complete =
    summary.missing === 0 &&
    summary.pendingReview === 0 &&
    summary.needsChange === 0 &&
    summary.approved === summary.totalRequired;

  return summary;
}

export function documentsToAttend(summary: DocumentSummary): number {
  return summary.missing + summary.pendingReview + summary.needsChange;
}

export function deriveInternalWorkflowState(
  evaluation: CreditEvaluation | null | undefined,
  documentSummary: DocumentSummary,
  legalReviewStatus?: LegalReviewStatus,
  finalApprovedCreditLine?: number | null,
  contractStatus?: ContractStatus,
): InternalWorkflowState {
  if (!evaluation) {
    return {
      status: "evaluation_pending",
      label: "Evaluación pendiente",
      nextAction: "run_evaluation",
      nextActionLabel: "Ejecutar evaluación",
    };
  }

  if (!evaluation.bureauPassed || evaluation.publicDecision === "rejected") {
    return {
      status: "rejected",
      label: "Rechazada",
      nextAction: "close_application",
      nextActionLabel: "Cerrar seguimiento",
    };
  }

  if (contractStatus === "signed") {
    return {
      status: "completed",
      label: "Solicitud completada",
      nextAction: "none",
      nextActionLabel: "Sin acción pendiente",
    };
  }

  if (contractStatus === "sent_for_signature") {
    return {
      status: "contracts_sent_for_signature",
      label: "Contratos enviados a firma",
      nextAction: "register_contract_signature",
      nextActionLabel: "Registrar firma de contratos",
    };
  }

  if (contractStatus === "prepared") {
    return {
      status: "contracts_pending",
      label: "Contratos preparados",
      nextAction: "register_contract_signature",
      nextActionLabel: "Registrar firma de contratos",
    };
  }

  if (finalApprovedCreditLine !== null && finalApprovedCreditLine !== undefined) {
    return {
      status: "contracts_pending",
      label: "Preparación de contratos",
      nextAction: "prepare_contracts",
      nextActionLabel: "Preparar contratos",
    };
  }

  if (legalReviewStatus === "rejected") {
    return {
      status: "legal_review_rejected",
      label: "Investigación legal rechazada",
      nextAction: "close_application",
      nextActionLabel: "Cerrar seguimiento",
    };
  }

  if (legalReviewStatus === "approved") {
    return {
      status: "legal_review",
      label: "Investigación legal aprobada",
      nextAction: "confirm_credit_line",
      nextActionLabel: "Confirmar línea",
    };
  }

  if (legalReviewStatus === "in_progress") {
    return {
      status: "legal_review",
      label: "Investigación legal",
      nextAction: "approve_legal_review",
      nextActionLabel: "Aprobar investigación legal",
    };
  }

  if (documentSummary.needsChange > 0) {
    return {
      status: "approved_documents_need_changes",
      label: "Aprobada · Corrección documental",
      nextAction: "request_document_changes",
      nextActionLabel: "Solicitar correcciones",
    };
  }

  if (documentSummary.missing > 0) {
    return {
      status: "approved_missing_documents",
      label: "Aprobada · Documentos pendientes",
      nextAction: "request_documents",
      nextActionLabel: "Solicitar documentos",
    };
  }

  if (documentSummary.pendingReview > 0) {
    return {
      status: "approved_document_review",
      label: "Aprobada · Revisión documental",
      nextAction: "review_documents",
      nextActionLabel: "Revisar documentos",
    };
  }

  if (documentSummary.complete) {
    return {
      status: "approved_ready_for_legal_review",
      label: "Aprobada · Lista para investigación legal",
      nextAction: "start_legal_review",
      nextActionLabel: "Continuar investigación legal",
    };
  }

  return {
    status: "approved_missing_documents",
    label: "Aprobada · Documentos pendientes",
    nextAction: "request_documents",
    nextActionLabel: "Solicitar documentos",
  };
}
