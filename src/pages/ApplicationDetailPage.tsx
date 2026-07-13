import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type {
  Application,
  CreditEvaluation,
  DocumentStatus,
  InternalNextAction,
  InternalWorkflowState,
  PersonType,
} from "../features/applications/types/application.types";
import { getApplicationById, updateApplication } from "../features/applications/services/applicationService";
import {
  simulateDocumentUpload,
  updateDocumentStatus,
} from "../features/documents/services/documentService";
import { runDecisionModel } from "../features/validations/services/validationService";
import { ApplicationDetailHeader } from "../features/applications/components/ApplicationDetailHeader";
import { ApplicationSummaryCards } from "../features/applications/components/ApplicationSummaryCards";
import { ApplicationTimeline } from "../features/applications/components/ApplicationTimeline";
import { ApplicantInfoPanel } from "../features/applications/components/ApplicantInfoPanel";
import { DocumentChecklist } from "../features/documents/components/DocumentChecklist";
import { DecisionPanel } from "../features/validations/components/DecisionPanel";
import { ValidationPanel } from "../features/validations/components/ValidationPanel";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";
import { EmptyState } from "../shared/components/EmptyState";
import { SkeletonCard } from "../shared/components/Skeleton";
import { Tabs } from "../shared/components/Tabs";
import { formatDateTime, formatMoney, rejectionReasonLabels } from "../shared/lib/formatters";
import { createId } from "../shared/lib/ids";
import { calculateDocumentSummary, deriveInternalWorkflowState, documentsToAttend } from "../features/applications/utils/workflowState";
import {
  evaluateCreditByPersonType,
  scoreRangeLabel,
} from "../features/solicitud/utils/creditEvaluation";

const tabs = [
  { id: "resumen", label: "Resumen" },
  { id: "documentos", label: "Documentos" },
  { id: "validaciones", label: "Validaciones" },
  { id: "datos", label: "Datos capturados" },
  { id: "actividad", label: "Actividad" },
];

type DetailTab = (typeof tabs)[number]["id"];

const scenarioCases = [
  { label: "PF rechazada por score", personType: "fisica" as const, bureauHasHit: true, bureauScore: 610, documentsComplete: true },
  { label: "PF sugerida $10,000", personType: "fisica" as const, bureauHasHit: true, bureauScore: 630, documentsComplete: true },
  { label: "PF sugerida $60,000", personType: "fisica" as const, bureauHasHit: true, bureauScore: 720, documentsComplete: true },
  { label: "PM rechazada por score", personType: "moral" as const, bureauHasHit: true, bureauScore: 499, documentsComplete: true },
  { label: "PM sugerida $10,000", personType: "moral" as const, bureauHasHit: true, bureauScore: 500, documentsComplete: true },
  { label: "PM sugerida $60,000", personType: "moral" as const, bureauHasHit: true, bureauScore: 700, documentsComplete: true },
  { label: "Sin historial", personType: "fisica" as const, bureauHasHit: false, bureauScore: null, documentsComplete: true },
  { label: "Con documentos pendientes", personType: "fisica" as const, bureauHasHit: true, bureauScore: 680, documentsComplete: false },
];

function InfoGrid({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <div className="mt-3 grid gap-3">
        {rows.map(([label, value]) => (
          <div className="flex items-start justify-between gap-4 border-t border-slate-200 pt-3 first:border-t-0 first:pt-0" key={label}>
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="max-w-[60%] break-words text-right text-sm font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentCreditSummary({
  application,
  evaluation,
  workflow,
}: {
  application: Application;
  evaluation?: CreditEvaluation;
  workflow: InternalWorkflowState;
}) {
  const documentSummary = application.documentSummary ?? calculateDocumentSummary(application.documents);
  const phone = application.physicalPerson?.phone ?? application.legalRepresentative?.phone ?? "No capturado";
  const rejectionReason =
    evaluation?.rejectionReason === "no_credit_history"
      ? "Sin historial crediticio"
      : evaluation?.rejectionReason === "score_below_minimum"
        ? "Score menor al mínimo"
        : application.rejectionReason
          ? rejectionReasonLabels[application.rejectionReason]
          : "No aplica";

  const identificationRows: Array<[string, string]> = [
    ["Folio", application.folio],
    ["Solicitante", application.applicantName],
    ["Tipo de persona", application.personType === "fisica" ? "Persona Física" : "Persona Moral"],
    ["Teléfono", phone],
    ["OTP verificado", application.otpVerified ? "Sí" : "No"],
  ];

  const evaluationRows: Array<[string, string]> = [
    ["Resultado de Buró", evaluation ? (evaluation.bureauPassed ? "Aprobado" : "Rechazado") : "Pendiente"],
    ["Hit Buró", evaluation ? (evaluation.bureauHasHit ? "Sí" : "No") : "Pendiente"],
    ["Score obtenido", evaluation?.bureauScore === null || evaluation?.bureauScore === undefined ? "No disponible" : String(evaluation.bureauScore)],
    ["Rango de score", scoreRangeLabel(evaluation?.bureauScore ?? null)],
    ["Línea sugerida por score", formatMoney(evaluation?.suggestedCreditLine ?? application.assignedCreditLine)],
    ["Línea final aprobada", formatMoney(application.finalApprovedCreditLine ?? null)],
    ["Fecha de evaluación", evaluation?.evaluatedAt ? formatDateTime(evaluation.evaluatedAt) : "Pendiente"],
  ];
  if (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true" && application.demoCreditScenario) {
    evaluationRows.push(["Configuración de evaluación", application.demoCreditScenario]);
  }

  const documentationRows: Array<[string, string]> = [
    ["Total requerido", String(documentSummary.totalRequired)],
    ["Faltan por cargar", String(documentSummary.missing)],
    ["Pendientes de revisión", String(documentSummary.pendingReview)],
    ["Aprobados", String(documentSummary.approved)],
    ["Necesitan cambio", String(documentSummary.needsChange)],
  ];

  const trackingRows: Array<[string, string]> = [
    ["Decisión interna", evaluation?.internalDecision === "approved_for_followup" ? "Aprobada para seguimiento" : evaluation?.internalDecision === "rejected" ? "Rechazada" : "Pendiente"],
    ["Estado operativo", workflow.label],
    ["Próximo paso", workflow.nextActionLabel],
    ["Contacto requerido", documentsToAttend(documentSummary) > 0 ? "Sí" : "No"],
    ["Investigación legal", application.legalReviewStatus ?? "pending"],
    ["Contratos", application.contractStatus ?? "pending"],
  ];

  if (evaluation?.publicDecision === "rejected") {
    trackingRows.push(["Motivo interno de rechazo", rejectionReason]);
  }

  return (
    <Card title="Evaluación operativa" description="Información de identificación, evaluación y seguimiento">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoGrid rows={identificationRows} title="Identificación" />
        <InfoGrid rows={evaluationRows} title="Evaluación" />
        <InfoGrid rows={documentationRows} title="Documentación" />
        <InfoGrid rows={trackingRows} title="Seguimiento" />
      </div>
    </Card>
  );
}

function actionsForWorkflow(nextAction: InternalNextAction): string[] {
  if (nextAction === "request_documents") {
    return ["Solicitar documentos", "Marcar contacto pendiente", "Marcar prospecto contactado"];
  }
  if (nextAction === "review_documents") {
    return ["Revisar documentos", "Marcar prospecto contactado"];
  }
  if (nextAction === "request_document_changes") {
    return ["Solicitar correcciones", "Marcar contacto pendiente", "Marcar prospecto contactado"];
  }
  if (nextAction === "start_legal_review") {
    return ["Iniciar investigación legal"];
  }
  if (nextAction === "approve_legal_review") {
    return ["Aprobar investigación legal", "Rechazar investigación legal"];
  }
  if (nextAction === "confirm_credit_line") {
    return ["Confirmar línea"];
  }
  if (nextAction === "prepare_contracts") {
    return ["Preparar contratos"];
  }
  if (nextAction === "register_contract_signature") {
    return ["Registrar firma de contratos"];
  }
  if (nextAction === "close_application") {
    return ["Cerrar seguimiento"];
  }
  return [];
}

function notificationRecipient(application: Application, type: "email" | "sms"): string {
  if (type === "email") {
    return application.physicalPerson?.email ?? application.legalRepresentative?.email ?? "contacto@alpez.mx";
  }
  return application.physicalPerson?.phone ?? application.legalRepresentative?.phone ?? "2220000000";
}

function createNotification(application: Application, template: NonNullable<Application["notificationRequests"]>[number]["template"], variables: Record<string, string | number> = {}) {
  return {
    type: "email" as const,
    template,
    recipient: notificationRecipient(application, "email"),
    applicationId: application.id,
    variables: {
      folio: application.folio,
      applicantName: application.applicantName,
      ...variables,
    },
  };
}

function effectiveCreditEvaluation(application: Application, documentSummary: ReturnType<typeof calculateDocumentSummary>): CreditEvaluation | undefined {
  if (application.creditEvaluation) return application.creditEvaluation;

  if (application.decision === "pendiente" && !application.decisionResult && application.bureauScore === null && application.assignedCreditLine === null) {
    return undefined;
  }

  const rejected = application.decision === "rechazada" || application.status === "rechazada";
  return {
    bureauHasHit: application.scenario !== "persona_moral_no_hit_buro",
    bureauScore: application.bureauScore,
    bureauPassed: !rejected,
    publicDecision: rejected ? "rejected" : "approved",
    internalDecision: rejected ? "rejected" : "approved_for_followup",
    suggestedCreditLine: application.assignedCreditLine,
    documentsComplete: documentSummary.complete,
    documentReviewRequired: !documentSummary.complete,
    rejectionReason: application.rejectionReason === "sin_historial_crediticio" ? "no_credit_history" : rejected ? "score_below_minimum" : null,
    evaluatedAt: application.decisionResult?.evaluatedAt ?? application.updatedAt,
  };
}

function CreditScenarioSimulator({
  application,
  documentSummary,
  onApply,
}: {
  application: Application;
  documentSummary: ReturnType<typeof calculateDocumentSummary>;
  onApply: (result: CreditEvaluation) => Promise<void>;
}) {
  const [personType, setPersonType] = useState<PersonType>(application.personType);
  const [bureauHasHit, setBureauHasHit] = useState(true);
  const [bureauScore, setBureauScore] = useState(application.personType === "fisica" ? 680 : 620);
  const [documentsComplete, setDocumentsComplete] = useState(documentSummary.complete);
  const [result, setResult] = useState<CreditEvaluation | null>(null);

  const calculate = () => {
    setResult(
      evaluateCreditByPersonType(
        { personType },
        { bureauHasHit, bureauScore: bureauHasHit ? bureauScore : null, documentsComplete },
      ),
    );
  };

  const clientMessage =
    result?.publicDecision === "approved"
      ? "Aprobado; un asesor se pondrá en contacto para indicar los siguientes pasos."
      : "Por el momento no podemos continuar con la solicitud.";

  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <summary className="cursor-pointer text-lg font-semibold text-slate-950">Herramientas de demostración</summary>
      <div className="mt-4">
        <h2 className="text-base font-bold text-slate-950">Probar escenario de evaluación</h2>
        <p className="mt-1 text-sm text-slate-500">La vista previa no modifica la solicitud hasta aplicar el resultado.</p>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <label className="rounded-xl bg-slate-50 p-4">
          <span className="block text-xs font-bold uppercase text-slate-400">Tipo de persona</span>
          <div className="mt-3 flex gap-2">
            <Button size="sm" type="button" variant={personType === "fisica" ? "primary" : "outline"} onClick={() => setPersonType("fisica")}>
              Física
            </Button>
            <Button size="sm" type="button" variant={personType === "moral" ? "primary" : "outline"} onClick={() => setPersonType("moral")}>
              Moral
            </Button>
          </div>
        </label>
        <label className="rounded-xl bg-slate-50 p-4">
          <span className="block text-xs font-bold uppercase text-slate-400">¿Cuenta con historial crediticio?</span>
          <div className="mt-3 flex gap-2">
            <Button size="sm" type="button" variant={bureauHasHit ? "primary" : "outline"} onClick={() => setBureauHasHit(true)}>
              Sí
            </Button>
            <Button size="sm" type="button" variant={!bureauHasHit ? "primary" : "outline"} onClick={() => setBureauHasHit(false)}>
              No
            </Button>
          </div>
        </label>
        <label className="rounded-xl bg-slate-50 p-4">
          <span className="block text-xs font-bold uppercase text-slate-400">Score</span>
          <input
            className="mt-3 h-10 w-full rounded-[10px] border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#0F4C81] focus:ring-2 focus:ring-[#E6F0FA]"
            disabled={!bureauHasHit}
            max={850}
            min={0}
            type="number"
            value={bureauScore}
            onChange={(event) => setBureauScore(Number(event.target.value))}
          />
        </label>
        <label className="rounded-xl bg-slate-50 p-4">
          <span className="block text-xs font-bold uppercase text-slate-400">¿Tiene los documentos completos?</span>
          <div className="mt-3 flex gap-2">
            <Button size="sm" type="button" variant={documentsComplete ? "primary" : "outline"} onClick={() => setDocumentsComplete(true)}>
              Sí
            </Button>
            <Button size="sm" type="button" variant={!documentsComplete ? "primary" : "outline"} onClick={() => setDocumentsComplete(false)}>
              No
            </Button>
          </div>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {scenarioCases.map((scenario) => (
          <Button
            key={scenario.label}
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              setPersonType(scenario.personType);
              setBureauHasHit(scenario.bureauHasHit);
              setBureauScore(scenario.bureauScore ?? 0);
              setDocumentsComplete(scenario.documentsComplete);
              setResult(
                evaluateCreditByPersonType(
                  { personType: scenario.personType },
                  {
                    bureauHasHit: scenario.bureauHasHit,
                    bureauScore: scenario.bureauScore,
                    documentsComplete: scenario.documentsComplete,
                  },
                ),
              );
            }}
          >
            {scenario.label}
          </Button>
        ))}
      </div>
      <div className="mt-4">
        <Button type="button" onClick={calculate}>Calcular resultado</Button>
      </div>
      {result && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <h3 className="font-bold text-slate-950">Resultado de prueba</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div><p className="text-xs font-bold uppercase text-slate-400">Decisión interna</p><p className="font-semibold text-slate-950">{result.internalDecision === "approved_for_followup" ? "Aprobada para seguimiento" : "Rechazada"}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Línea sugerida por score</p><p className="font-semibold text-slate-950">{formatMoney(result.suggestedCreditLine)}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Rango</p><p className="font-semibold text-slate-950">{scoreRangeLabel(result.bureauScore)}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Estado documental</p><p className="font-semibold text-slate-950">{result.documentsComplete ? "Completos" : "Incompletos"}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Mensaje cliente</p><p className="font-semibold text-slate-950">{clientMessage}</p></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onApply(result)}>Aplicar a la solicitud</Button>
            <Button type="button" variant="outline" onClick={() => setResult(null)}>Cancelar</Button>
          </div>
        </div>
      )}
    </details>
  );
}

export function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("resumen");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setApplication(await getApplicationById(id));
    } catch {
      setError("No se pudo cargar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!id) return;
    const nextApplication = await getApplicationById(id);
    setApplication(nextApplication);
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function withRunning(action: () => Promise<unknown>) {
    setRunning(true);
    try {
      await action();
      await refresh();
    } finally {
      setRunning(false);
    }
  }

  async function runDecision() {
    if (!application) return;
    if (application.creditEvaluation || application.decisionResult || application.decision !== "pendiente") {
      const confirmed = window.confirm("Recalcular la evaluación sustituirá el resultado actual de esta solicitud. ¿Deseas continuar?");
      if (!confirmed) return;
    }
    await withRunning(() => runDecisionModel(application.id));
  }

  async function applyCreditEvaluation(result: CreditEvaluation) {
    if (!application) return;
    const documentSummary = calculateDocumentSummary(application.documents);
    const workflow = deriveInternalWorkflowState(result, documentSummary);
    await updateApplication(application.id, {
      creditEvaluation: result,
      bureauHasHit: result.bureauHasHit,
      bureauScore: result.bureauScore,
      assignedCreditLine: result.suggestedCreditLine,
      riskLevel: result.bureauPassed ? (scoreRangeLabel(result.bureauScore) === "Riesgo alto" ? "alto" : scoreRangeLabel(result.bureauScore) === "Riesgo medio" ? "medio" : "bajo") : "no_aplica",
      decision: result.publicDecision === "approved" ? "aprobada" : "rechazada",
      status: result.publicDecision === "approved" ? (workflow.status === "approved_document_review" ? "documentos_revision" : workflow.status === "approved_ready_for_legal_review" ? "investigacion_legal" : "documentos_pendientes") : "rechazada",
      documentsComplete: documentSummary.complete,
      documentSummary,
      documentReviewRequired: !documentSummary.complete,
      requiresDocumentFollowUp: !documentSummary.complete,
      internalWorkflowStatus: workflow.status,
      internalNextAction: workflow.nextAction,
      timeline: [
        ...application.timeline,
        {
          id: createId("tl"),
          applicationId: application.id,
          status: application.status,
          title: "Evaluación aplicada manualmente",
          description: workflow.label,
          actor: "Agente ALPEZ",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await refresh();
  }

  async function uploadDocument(documentId: string) {
    if (!application) return;
    setBusyDocumentId(documentId);
    try {
      await simulateDocumentUpload(application.id, documentId);
      await refresh();
    } finally {
      setBusyDocumentId(null);
    }
  }

  async function changeDocumentStatus(documentId: string, status: DocumentStatus, comments?: string) {
    if (!application) return;
    setBusyDocumentId(documentId);
    try {
      await updateDocumentStatus(application.id, documentId, status, comments);
      await refresh();
    } finally {
      setBusyDocumentId(null);
    }
  }

  async function markFollowUpAction(action: string) {
    if (!application) return;
    await updateApplication(application.id, {
      followUpAction: action,
      timeline: [
        ...application.timeline,
        {
          id: createId("tl"),
          applicationId: application.id,
          status: application.status,
          title: "Acción de seguimiento",
          description: action,
          actor: "Agente ALPEZ",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await refresh();
  }

  async function runContextAction(workflow: InternalWorkflowState) {
    if (!application) return;
    if (workflow.nextAction === "run_evaluation") {
      await runDecision();
      return;
    }
    if (workflow.nextAction === "review_documents") {
      setActiveTab("documentos");
      return;
    }
    if (workflow.nextAction === "start_legal_review") {
      await markFollowUpAction("Iniciar investigación legal");
      await updateApplication(application.id, {
        status: "investigacion_legal",
        internalWorkflowStatus: "legal_review",
        internalNextAction: "approve_legal_review",
        legalReviewStatus: "in_progress",
      });
      await refresh();
      return;
    }
    if (workflow.nextAction === "approve_legal_review") {
      await markFollowUpAction("Aprobar investigación legal");
      await updateApplication(application.id, {
        status: "investigacion_legal",
        legalReviewStatus: "approved",
        internalWorkflowStatus: "legal_review",
        internalNextAction: "confirm_credit_line",
      });
      await refresh();
      return;
    }
    if (workflow.nextAction === "confirm_credit_line") {
      const suggested = application.assignedCreditLine ?? application.creditEvaluation?.suggestedCreditLine ?? 0;
      const amountText = window.prompt(
        `Línea sugerida por score: ${formatMoney(suggested)}\nLínea final aprobada:`,
        String(suggested),
      );
      if (!amountText) return;
      const amount = Number(amountText);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const observations = window.prompt("Observaciones", "Línea confirmada por agente.") ?? "";
      await markFollowUpAction(`Confirmar línea final ${formatMoney(amount)}`);
      await updateApplication(application.id, {
        finalApprovedCreditLine: amount,
        internalWorkflowStatus: "credit_line_approved",
        internalNextAction: "prepare_contracts",
        notificationRequests: [
          ...(application.notificationRequests ?? []),
          createNotification(application, "final_credit_line_approved", {
            finalApprovedCreditLine: amount,
            observations,
          }),
        ],
        timeline: [
          ...application.timeline,
          {
            id: createId("tl"),
            applicationId: application.id,
            status: application.status,
            title: "credit_line_confirmed",
            description: `Línea final aprobada: ${formatMoney(amount)}. ${observations}`,
            actor: "Agente ALPEZ",
            createdAt: new Date().toISOString(),
          },
        ],
      });
      await refresh();
      return;
    }
    if (workflow.nextAction === "prepare_contracts") {
      await markFollowUpAction("Preparar contratos");
      await updateApplication(application.id, {
        status: "contratos",
        internalWorkflowStatus: "contracts_pending",
        internalNextAction: "register_contract_signature",
        contractStatus: "prepared",
        notificationRequests: [
          ...(application.notificationRequests ?? []),
          createNotification(application, "contracts_ready", {
            finalApprovedCreditLine: application.finalApprovedCreditLine ?? 0,
          }),
        ],
      });
      await refresh();
      return;
    }
    if (workflow.nextAction === "register_contract_signature") {
      await markFollowUpAction("Registrar firma de contratos");
      await updateApplication(application.id, {
        status: "aprobada",
        internalWorkflowStatus: "completed",
        internalNextAction: "none",
        contractStatus: "signed",
        notificationRequests: [
          ...(application.notificationRequests ?? []),
          createNotification(application, "application_completed", {
            finalApprovedCreditLine: application.finalApprovedCreditLine ?? 0,
          }),
        ],
      });
      await refresh();
      return;
    }
    if (workflow.nextAction === "request_documents") {
      await markFollowUpAction("Solicitar documentos");
      await updateApplication(application.id, {
        notificationRequests: [
          ...(application.notificationRequests ?? []),
          createNotification(application, "documents_requested"),
        ],
      });
      return;
    }
    if (workflow.nextAction === "request_document_changes") {
      await markFollowUpAction("Solicitar correcciones");
      return;
    }
    if (workflow.nextAction === "close_application") {
      await markFollowUpAction("Cerrar seguimiento");
    }
  }

  async function runFollowUpAction(action: string, workflow: InternalWorkflowState) {
    if (!application) return;
    if (action === workflow.nextActionLabel || action === "Iniciar investigación legal" || action === "Aprobar investigación legal" || action === "Confirmar línea" || action === "Preparar contratos" || action === "Registrar firma de contratos") {
      await runContextAction(workflow);
      return;
    }
    if (action === "Rechazar investigación legal") {
      await markFollowUpAction(action);
      await updateApplication(application.id, {
        status: "rechazada",
        decision: "rechazada",
        legalReviewStatus: "rejected",
        internalWorkflowStatus: "legal_review_rejected",
        internalNextAction: "close_application",
        timeline: [
          ...application.timeline,
          {
            id: createId("tl"),
            applicationId: application.id,
            status: "rechazada",
            title: "Investigación legal rechazada",
            description: "No se permite confirmar línea ni preparar contratos.",
            actor: "Agente ALPEZ",
            createdAt: new Date().toISOString(),
          },
        ],
      });
      await refresh();
      return;
    }
    await markFollowUpAction(action);
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title={error}
        description="Reintenta cargar el expediente."
        action={<Button onClick={load}>Reintentar</Button>}
      />
    );
  }

  if (!application) {
    return (
      <EmptyState
        title="Solicitud no encontrada."
        description="El identificador solicitado no está disponible."
        action={<Button onClick={() => navigate("/solicitudes")}>Volver a solicitudes</Button>}
      />
    );
  }

  const documentSummary = application.documentSummary ?? calculateDocumentSummary(application.documents);
  const effectiveEvaluation = effectiveCreditEvaluation(application, documentSummary);
  const workflow = deriveInternalWorkflowState(
    effectiveEvaluation,
    documentSummary,
    application.legalReviewStatus,
    application.finalApprovedCreditLine,
    application.contractStatus,
  );
  const showDemoTools = import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE === "true";

  return (
    <>
      <ApplicationDetailHeader
        application={application}
        hasEvaluation={Boolean(effectiveEvaluation)}
        running={running}
        workflow={workflow}
        onRunDecision={runDecision}
        onRunContextAction={() => void runContextAction(workflow)}
      />
      <ApplicationSummaryCards
        application={application}
        documentSummary={documentSummary}
        workflow={workflow}
        onDocumentsClick={() => setActiveTab("documentos")}
      />
      <div className="mt-5">
        <Tabs activeTab={activeTab} tabs={tabs} onChange={(tab) => setActiveTab(tab as DetailTab)} />
      </div>

      <div className="mt-5 space-y-5">
        {activeTab === "resumen" && (
          <>
            <Card title="Resumen de solicitud" description="Estado general, decisión y próximo paso sugerido">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Resultado de evaluación</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">
                    {effectiveEvaluation?.publicDecision === "approved"
                      ? "Aprobada para continuar"
                      : effectiveEvaluation?.publicDecision === "rejected"
                        ? "Rechazada"
                        : "Pendiente"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Estado operativo</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">{workflow.label}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Próximo paso</p>
                  <p className="mt-2 text-lg font-bold text-slate-950">{workflow.nextActionLabel}</p>
                </div>
                {effectiveEvaluation?.publicDecision === "rejected" && application.rejectionReason && (
                  <div className="rounded-xl bg-red-50 p-4 lg:col-span-3">
                    <p className="text-xs font-bold uppercase text-red-400">Motivo de rechazo</p>
                    <p className="mt-2 font-semibold text-red-700">{rejectionReasonLabels[application.rejectionReason]}</p>
                  </div>
                )}
              </div>
            </Card>
            <AgentCreditSummary application={application} evaluation={effectiveEvaluation} workflow={workflow} />
            <DecisionPanel application={application} onRefresh={refresh} />
            <Card title="Acciones de seguimiento" description="Acciones disponibles para el estado actual">
              <div className="flex flex-wrap gap-2">
                {actionsForWorkflow(workflow.nextAction).length === 0 ? (
                  <p className="text-sm font-semibold text-slate-500">No hay acciones operativas disponibles.</p>
                ) : (
                  actionsForWorkflow(workflow.nextAction).map((action) => (
                    <Button key={action} size="sm" type="button" variant="outline" onClick={() => void runFollowUpAction(action, workflow)}>
                      {action}
                    </Button>
                  ))
                )}
              </div>
              {application.followUpAction && (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  Última acción: {application.followUpAction}
                </p>
              )}
            </Card>
            {showDemoTools && (
              <CreditScenarioSimulator
                application={application}
                documentSummary={documentSummary}
                onApply={applyCreditEvaluation}
              />
            )}
            <ApplicationTimeline timeline={application.timeline} />
          </>
        )}

        {activeTab === "documentos" && (
          <DocumentChecklist
            busyDocumentId={busyDocumentId}
            documents={application.documents}
            onStatusChange={changeDocumentStatus}
            onUpload={uploadDocument}
          />
        )}

        {activeTab === "validaciones" && <ValidationPanel application={application} onRefresh={refresh} />}

        {activeTab === "datos" && <ApplicantInfoPanel application={application} />}

        {activeTab === "actividad" && <ApplicationTimeline timeline={application.timeline} />}
      </div>
    </>
  );
}
