import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Application, DocumentStatus } from "../features/applications/types/application.types";
import { getApplicationById } from "../features/applications/services/applicationService";
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
import { rejectionReasonLabels } from "../shared/lib/formatters";

const tabs = [
  { id: "resumen", label: "Resumen" },
  { id: "documentos", label: "Documentos" },
  { id: "validaciones", label: "Validaciones" },
  { id: "datos", label: "Datos capturados" },
  { id: "actividad", label: "Actividad" },
];

type DetailTab = (typeof tabs)[number]["id"];

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
            <DecisionPanel application={application} onRefresh={refresh} />
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
