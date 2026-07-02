import { describe, expect, it } from "vitest";
import type { CreditEvaluation, DocumentItem } from "../types/application.types";
import { calculateDocumentSummary, deriveInternalWorkflowState, documentsToAttend } from "./workflowState";

function document(id: string, status: DocumentItem["status"], fileName?: string): DocumentItem {
  return {
    id,
    applicationId: "app_test",
    type: "curp",
    label: id,
    required: true,
    status,
    fileName,
  };
}

const approvedEvaluation: CreditEvaluation = {
  bureauHasHit: true,
  bureauScore: 680,
  bureauPassed: true,
  publicDecision: "approved",
  internalDecision: "approved_for_followup",
  suggestedCreditLine: 30000,
  documentsComplete: false,
  documentReviewRequired: true,
  rejectionReason: null,
  evaluatedAt: "2026-06-26T00:00:00.000Z",
};

describe("calculateDocumentSummary", () => {
  it("counts uploaded documents as pending review so incomplete never has zero attention", () => {
    const summary = calculateDocumentSummary([document("curp", "cargado", "curp.pdf")]);

    expect(summary.complete).toBe(false);
    expect(summary.uploaded).toBe(1);
    expect(summary.pendingReview).toBe(1);
    expect(documentsToAttend(summary)).toBeGreaterThan(0);
  });

  it("marks complete only when all required documents are approved", () => {
    const summary = calculateDocumentSummary([
      document("curp", "validado", "curp.pdf"),
      document("domicilio", "validado", "domicilio.pdf"),
    ]);

    expect(summary.complete).toBe(true);
    expect(summary.approved).toBe(2);
    expect(documentsToAttend(summary)).toBe(0);
  });
});

describe("deriveInternalWorkflowState", () => {
  it("requests documents when required files are missing", () => {
    const summary = calculateDocumentSummary([document("curp", "pendiente")]);
    const workflow = deriveInternalWorkflowState(approvedEvaluation, summary);

    expect(workflow.status).toBe("approved_missing_documents");
    expect(workflow.nextAction).toBe("request_documents");
  });

  it("moves to legal review when documents are approved", () => {
    const summary = calculateDocumentSummary([document("curp", "validado", "curp.pdf")]);
    const workflow = deriveInternalWorkflowState(approvedEvaluation, summary);

    expect(workflow.status).toBe("approved_ready_for_legal_review");
    expect(workflow.nextAction).toBe("start_legal_review");
  });
});
