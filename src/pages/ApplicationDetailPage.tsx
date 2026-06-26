import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Application, DocumentStatus } from "../features/applications/types/application.types";
import { getApplicationById, updateApplication } from "../features/applications/services/applicationService";
import {
  simulateDocumentUpload,
  updateDocumentStatus,
} from "../features/documents/services/documentService";
import {
  runBureauQuery,
  runDecisionModel,
  runIneValidation,
  runListsValidation,
  sendSmsCode,
} from "../features/validations/services/validationService";
import { ApplicationDetailHeader } from "../features/applications/components/ApplicationDetailHeader";
import { ApplicationSummaryCards } from "../features/applications/components/ApplicationSummaryCards";
import { ApplicationTimeline } from "../features/applications/components/ApplicationTimeline";
import { ApplicantInfoPanel } from "../features/applications/components/ApplicantInfoPanel";
import { nextStepLabels } from "../features/applications/utils/nextStep";
import { DocumentChecklist } from "../features/documents/components/DocumentChecklist";
import { DecisionPanel } from "../features/validations/components/DecisionPanel";
import { ValidationPanel } from "../features/validations/components/ValidationPanel";
import { ApplicationDecisionBadge } from "../shared/components/Badge";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";
import { EmptyState } from "../shared/components/EmptyState";
import { SkeletonCard } from "../shared/components/Skeleton";
import { Tabs } from "../shared/components/Tabs";
import { formatDateTime, formatMoney, rejectionReasonLabels } from "../shared/lib/formatters";
import { createId } from "../shared/lib/ids";
import {
  evaluatePhysicalPersonCredit,
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
  { label: "Caso rechazado por score", bureauHasHit: true, bureauScore: 610, documentsComplete: true },
  { label: "Caso sin historial", bureauHasHit: false, bureauScore: null, documentsComplete: true },
  { label: "Caso aprobado $10,000", bureauHasHit: true, bureauScore: 640, documentsComplete: true },
  { label: "Caso aprobado $20,000", bureauHasHit: true, bureauScore: 660, documentsComplete: true },
  { label: "Caso aprobado $30,000", bureauHasHit: true, bureauScore: 680, documentsComplete: true },
  { label: "Aprobado $30,000 con documentos pendientes", bureauHasHit: true, bureauScore: 680, documentsComplete: false },
  { label: "Caso aprobado $40,000", bureauHasHit: true, bureauScore: 700, documentsComplete: true },
  { label: "Caso aprobado $60,000", bureauHasHit: true, bureauScore: 725, documentsComplete: true },
];

function pendingDocumentsCount(application: Application): number {
  return application.documents.filter((document) => document.required && ["pendiente", "rechazado"].includes(document.status)).length;
}

function AgentCreditSummary({ application }: { application: Application }) {
  const evaluation = application.creditEvaluation;
  const phone = application.physicalPerson?.phone ?? application.legalRepresentative?.phone ?? "No capturado";
  const rejectionReason =
    evaluation?.rejectionReason === "no_credit_history"
      ? "Sin historial crediticio"
      : evaluation?.rejectionReason === "score_below_minimum"
        ? "Score menor al mínimo"
        : application.rejectionReason
          ? rejectionReasonLabels[application.rejectionReason]
          : "No aplica";

  const rows = [
    ["Folio", application.folio],
    ["Trace ID", application.trace_id],
    ["Nombre del solicitante", application.applicantName],
    ["Teléfono", phone],
    ["Monto solicitado", formatMoney(application.requestedAmount)],
    ["Documentos completos", application.documentsComplete ? "Sí" : "No"],
    ["Documentos pendientes", String(pendingDocumentsCount(application))],
    ["OTP verificado", application.otpVerified ? "Sí" : "No"],
    ["Consulta Buró", evaluation ? "Completada" : "Pendiente"],
    ["Hit Buró", evaluation ? (evaluation.bureauHasHit ? "Sí" : "No") : "Pendiente"],
    ["Score obtenido", evaluation?.bureauScore === null || evaluation?.bureauScore === undefined ? "No disponible" : String(evaluation.bureauScore)],
    ["Rango de score", scoreRangeLabel(evaluation?.bureauScore ?? null)],
    ["Línea calculada", formatMoney(evaluation?.approvedCreditLine ?? application.assignedCreditLine)],
    ["Decisión", evaluation?.decision === "approved" ? "Aprobada" : evaluation?.decision === "rejected" ? "Rechazada" : "Pendiente"],
    ["Motivo interno de rechazo", rejectionReason],
    ["Fecha de evaluación", evaluation?.evaluatedAt ? formatDateTime(evaluation.evaluatedAt) : "Pendiente"],
  ];

  return (
    <Card title="Evaluación operativa" description="Información técnica visible solo para el equipo interno">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {rows.map(([label, value]) => (
          <div className="rounded-xl bg-slate-50 p-3" key={label}>
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function CreditScenarioSimulator() {
  const [bureauHasHit, setBureauHasHit] = useState(true);
  const [bureauScore, setBureauScore] = useState(680);
  const [documentsComplete, setDocumentsComplete] = useState(true);
  const [result, setResult] = useState<ReturnType<typeof evaluatePhysicalPersonCredit> | null>(null);

  const calculate = () => {
    setResult(evaluatePhysicalPersonCredit(bureauHasHit, bureauHasHit ? bureauScore : null, documentsComplete));
  };

  const clientMessage =
    result?.decision === "approved"
      ? result.documentsComplete
        ? "Aprobado; un asesor se pondrá en contacto para explicar los siguientes pasos."
        : "Aprobado; un asesor se pondrá en contacto para completar documentos."
      : "Por el momento no podemos continuar con la solicitud.";

  return (
    <Card title="Probar escenario de crédito" description="Herramienta interna para la demostración">
      <div className="grid gap-4 lg:grid-cols-3">
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
              setBureauHasHit(scenario.bureauHasHit);
              setBureauScore(scenario.bureauScore ?? 0);
              setDocumentsComplete(scenario.documentsComplete);
              setResult(evaluatePhysicalPersonCredit(scenario.bureauHasHit, scenario.bureauScore, scenario.documentsComplete));
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
        <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-5">
          <div><p className="text-xs font-bold uppercase text-slate-400">Decisión</p><p className="font-semibold text-slate-950">{result.decision === "approved" ? "Aprobada" : "Rechazada"}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Línea asignada</p><p className="font-semibold text-slate-950">{formatMoney(result.approvedCreditLine)}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Rango</p><p className="font-semibold text-slate-950">{scoreRangeLabel(result.bureauScore)}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Estado documental</p><p className="font-semibold text-slate-950">{result.documentsComplete ? "Completos" : "Incompletos"}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Mensaje cliente</p><p className="font-semibold text-slate-950">{clientMessage}</p></div>
        </div>
      )}
    </Card>
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
      setError("No se pudo cargar la solicitud demo.");
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

  async function runNextValidation() {
    if (!application) return;
    await withRunning(async () => {
      if (["nueva", "captura_datos", "validacion_ine"].includes(application.status)) {
        await runIneValidation(application.id);
        return;
      }
      if (["documentos_pendientes", "documentos_revision", "sms_pendiente"].includes(application.status)) {
        await sendSmsCode(application.id);
        return;
      }
      if (application.status === "consulta_buro") {
        await runBureauQuery(application.id);
        return;
      }
      if (application.status === "validacion_listas") {
        await runListsValidation(application.id);
        return;
      }
      await runDecisionModel(application.id);
    });
  }

  async function runDecision() {
    if (!application) return;
    await withRunning(() => runDecisionModel(application.id));
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
          actor: "Agente demo",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    await refresh();
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
        description="Reintenta cargar el expediente desde el store local."
        action={<Button onClick={load}>Reintentar</Button>}
      />
    );
  }

  if (!application) {
    return (
      <EmptyState
        title="Solicitud no encontrada."
        description="El identificador no existe en el store demo."
        action={<Button onClick={() => navigate("/solicitudes")}>Volver a solicitudes</Button>}
      />
    );
  }

  return (
    <>
      <ApplicationDetailHeader
        application={application}
        running={running}
        onRunDecision={runDecision}
        onRunNext={runNextValidation}
      />
      <ApplicationSummaryCards application={application} />
      <div className="mt-5">
        <Tabs activeTab={activeTab} tabs={tabs} onChange={(tab) => setActiveTab(tab as DetailTab)} />
      </div>

      <div className="mt-5 space-y-5">
        {activeTab === "resumen" && (
          <>
            <Card title="Resumen de solicitud" description="Estado general, decisión y próximo paso sugerido">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Decisión</p>
                  <div className="mt-2">
                    <ApplicationDecisionBadge decision={application.decision} />
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Próximo paso</p>
                  <p className="mt-2 font-semibold text-slate-950">{nextStepLabels[application.status]}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase text-slate-400">Motivo de rechazo</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {application.rejectionReason ? rejectionReasonLabels[application.rejectionReason] : "No aplica"}
                  </p>
                </div>
              </div>
            </Card>
            <AgentCreditSummary application={application} />
            <DecisionPanel application={application} onRefresh={refresh} />
            <Card title="Acciones de seguimiento" description="Acciones operativas simuladas para el agente">
              <div className="flex flex-wrap gap-2">
                {[
                  "Marcar contacto pendiente",
                  "Marcar cliente contactado",
                  "Solicitar documentos",
                  "Continuar investigación legal",
                  "Preparar contratos",
                ].map((action) => (
                  <Button key={action} size="sm" type="button" variant="outline" onClick={() => void markFollowUpAction(action)}>
                    {action}
                  </Button>
                ))}
              </div>
              {application.followUpAction && (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  Última acción: {application.followUpAction}
                </p>
              )}
            </Card>
            <CreditScenarioSimulator />
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
