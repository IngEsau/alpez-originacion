import { useEffect, useState } from "react";
import { CheckCircle2, Play, Search } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Application, ApplicationScenario, CreateApplicationPayload, DocumentStatus } from "../features/applications/types/application.types";
import type { Trace } from "../features/traces/types/trace.types";
import { createApplication, getApplicationById } from "../features/applications/services/applicationService";
import { DocumentChecklist } from "../features/documents/components/DocumentChecklist";
import { simulateDocumentUpload, updateDocumentStatus } from "../features/documents/services/documentService";
import {
  addTraceEvent,
  getTraceById,
  linkTraceApplication,
  runExistingClientInitialValidation,
  runKnockoutsValidation,
} from "../features/traces/services/traceService";
import { TraceTimeline } from "../features/traces/components/TraceTimeline";
import { TraceStatusBadge } from "../shared/components/Badge";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";
import { EmptyState } from "../shared/components/EmptyState";
import { Input } from "../shared/components/Input";
import { PageHeader } from "../shared/components/PageHeader";
import { Select } from "../shared/components/Select";
import { SkeletonCard } from "../shared/components/Skeleton";
import { formatMoney, personTypeLabels, traceStepLabels } from "../shared/lib/formatters";

const steps = [
  "ine_carga",
  "ine_validacion_calidad",
  "ine_validacion_vigencia",
  "ine_validacion_padron",
  "knockouts",
  "cliente_existente",
  "captura_datos",
  "documentos",
  "buro",
  "listas",
  "decision",
] as const;

const scenarioOptions: Array<{ value: ApplicationScenario; label: string }> = [
  { value: "persona_fisica_hit_buro", label: "Persona Física con hit Buró" },
  { value: "persona_moral_hit_buro", label: "Persona Moral con hit Buró" },
  { value: "persona_moral_no_hit_buro", label: "Persona Moral sin hit Buró" },
];

function personTypeFromScenario(scenario: ApplicationScenario) {
  return scenario === "persona_fisica_hit_buro" ? "fisica" : "moral";
}

function hasIneApproved(trace: Trace): boolean {
  return trace.events.some((event) => event.step === "ine_validacion_padron" && event.status === "success");
}

function hasKnockoutsApproved(trace: Trace): boolean {
  return trace.events.some((event) => event.step === "knockouts" && event.status === "success");
}

function hasExistingClientApproved(trace: Trace): boolean {
  return trace.events.some((event) => event.step === "cliente_existente" && event.status === "success");
}

function hasExistingClientRejected(trace: Trace): boolean {
  return trace.events.some((event) => event.step === "cliente_existente" && event.status === "error");
}

export function OriginacionFlowPage() {
  const { traceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [scenario, setScenario] = useState<ApplicationScenario>("persona_fisica_hit_buro");
  const [name, setName] = useState("Prospecto Originación Demo");
  const [amount, setAmount] = useState("50000");

  async function load() {
    if (!traceId) return;
    setLoading(true);
    try {
      const nextTrace = await getTraceById(traceId);
      setTrace(nextTrace);
      setApplication(nextTrace?.application_id ? await getApplicationById(nextTrace.application_id) : null);
      if (nextTrace?.person_type === "moral") setScenario("persona_moral_hit_buro");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!traceId) return;
    const nextTrace = await getTraceById(traceId);
    setTrace(nextTrace);
    setApplication(nextTrace?.application_id ? await getApplicationById(nextTrace.application_id) : null);
  }

  useEffect(() => {
    void load();
  }, [traceId]);

  const ineApproved = trace ? hasIneApproved(trace) : false;
  const knockoutsApproved = trace ? hasKnockoutsApproved(trace) : false;
  const existingClientApproved = trace ? hasExistingClientApproved(trace) : false;
  const existingClientRejected = trace ? hasExistingClientRejected(trace) : false;
  const initialValidationsComplete = ineApproved && knockoutsApproved && existingClientApproved;
  const flowBlocked = Boolean(trace && ["failed", "rejected"].includes(trace.status));
  const canCreateApplication = Boolean(trace && initialValidationsComplete && !trace.application_id && !flowBlocked);
  const selectedPersonType = personTypeFromScenario(scenario);
  const isDocumentsStep = location.pathname.endsWith("/documentos");
  const visibleStep = !ineApproved
    ? trace?.current_step
    : !initialValidationsComplete
      ? "Validaciones iniciales"
      : trace?.application_id
        ? isDocumentsStep
          ? "Documentos"
          : "Captura de datos"
        : "Captura de datos";

  async function runAction(action: () => Promise<unknown>) {
    setRunning(true);
    try {
      await action();
      await refresh();
    } finally {
      setRunning(false);
    }
  }

  async function createLinkedApplication() {
    if (!trace) return;
    const requestedAmount = Number(amount || 0);
    const payload: CreateApplicationPayload =
      selectedPersonType === "fisica"
        ? {
            trace_id: trace.trace_id,
            personType: "fisica",
            scenario,
            requestedAmount,
            executiveName: "Ejecutivo Demo",
            physicalPerson: {
              firstName: name.split(" ")[0] ?? "Prospecto",
              lastName: name.split(" ")[1] ?? "Demo",
              rfc: "ORPF900101A11",
              curp: "ORPF900101HPLRGN09",
              birthDate: "1990-01-01",
              phone: "2225550101",
              email: "originacion.pf@alpez.local",
              personalAddress: {
                street: "Av. Reforma 120",
                neighborhood: "Centro",
                municipality: "Puebla",
                state: "Puebla",
                zipCode: "72000",
                country: "México",
              },
              businessAddress: {
                street: "Calle Negocio 45",
                neighborhood: "La Paz",
                municipality: "Puebla",
                state: "Puebla",
                zipCode: "72160",
                country: "México",
              },
              businessActivity: "Comercio",
              businessSeniorityYears: 3,
              averageMonthlyIncome: 65000,
            },
          }
        : {
            trace_id: trace.trace_id,
            personType: "moral",
            scenario,
            requestedAmount,
            executiveName: "Ejecutivo Demo",
            moralPerson: {
              legalName: name,
              commercialName: name,
              rfc: "ORPM2101018A1",
              businessLine: "Comercio",
              constitutionDate: "2021-01-01",
              companySeniorityYears: 4,
              companyAddress: {
                street: "Blvd. Empresarial 818",
                neighborhood: "Angelópolis",
                municipality: "Puebla",
                state: "Puebla",
                zipCode: "72830",
                country: "México",
              },
              averageMonthlyIncome: 90000,
              annualSales: 1200000,
              currentAssets: 300000,
              currentLiabilities: 120000,
              totalAssets: 750000,
              totalLiabilities: 320000,
              annualOperatingProfit: 210000,
              averageBankBalance: 65000,
              bankAccountSeniorityMonths: 30,
            },
            legalRepresentative: {
              fullName: "Representante Originación Demo",
              rfc: "ROLD870930Q81",
              curp: "ROLD870930MPLRGN02",
              phone: "2225550123",
              email: "representante.originacion@alpez.local",
            },
          };

    await runAction(async () => {
      const application = await createApplication(payload);
      await linkTraceApplication(trace.trace_id, application.id);
      navigate(`/originacion/${trace.trace_id}/documentos`);
    });
  }

  async function uploadDocument(documentId: string) {
    if (!trace || !application) return;
    setBusyDocumentId(documentId);
    try {
      const document = await simulateDocumentUpload(application.id, documentId);
      await addTraceEvent(trace.trace_id, {
        step: "documentos",
        title: "Documento cargado",
        description: document.label,
        status: "success",
        metadata: { document_id: document.id, document_type: document.type, status: document.status },
      });
      await refresh();
    } finally {
      setBusyDocumentId(null);
    }
  }

  async function changeDocumentStatus(documentId: string, status: DocumentStatus, comments?: string) {
    if (!trace || !application) return;
    setBusyDocumentId(documentId);
    try {
      const document = await updateDocumentStatus(application.id, documentId, status, comments);
      await addTraceEvent(trace.trace_id, {
        step: "documentos",
        title: "Estado documental actualizado",
        description: `${document.label}: ${status}`,
        status: status === "rechazado" ? "warning" : "success",
        metadata: { document_id: document.id, document_type: document.type, status },
      });
      await refresh();
    } finally {
      setBusyDocumentId(null);
    }
  }

  if (loading) return <SkeletonCard />;

  if (!trace) {
    return (
      <EmptyState
        title="Traza no encontrada"
        description="El trace_id solicitado no existe en el store demo."
        action={<Button onClick={() => navigate("/originacion/iniciar")}>Iniciar originación</Button>}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Flujo de originación"
        description={`Trace ID: ${trace.trace_id}`}
        actions={
          <Button type="button" variant="outline" onClick={() => navigate(`/trazas/${trace.trace_id}`)}>
            Ver detalle de traza
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card title="Estado actual">
          <div className="space-y-3">
            <TraceStatusBadge status={trace.status} />
            <p className="text-sm text-slate-500">
              Paso: {typeof visibleStep === "string" && visibleStep in traceStepLabels ? traceStepLabels[visibleStep as keyof typeof traceStepLabels] : visibleStep}
            </p>
            <p className="text-xs font-semibold text-slate-500">Tipo: {trace.person_type ? personTypeLabels[trace.person_type] : "No definido"}</p>
          </div>
        </Card>
        <Card title="Pre-solicitud ligada">
          {trace.application_id ? (
            <div className="space-y-2">
              <p className="font-bold text-[#0F4C81]">{trace.application_id}</p>
              <Link className="text-xs font-semibold text-slate-500 hover:text-[#0F4C81]" to={`/solicitudes/${trace.application_id}`}>
                Ver solicitud en dashboard
              </Link>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Se creará después de aprobar validaciones iniciales.</p>
          )}
        </Card>
        <Card title="Resultado de entrada">
          <p className="text-sm text-slate-500">
            {flowBlocked
              ? "El flujo está detenido por validación inicial."
              : initialValidationsComplete
                ? "Validaciones iniciales aprobadas. Continúa captura/documentos."
                : ineApproved
                  ? "INE aprobada. Ejecuta validaciones iniciales."
                  : "Primero completa la carga y validación de INE."}
          </p>
        </Card>
      </div>

      <Card title="Stepper del proceso" description="Orden correcto de originación separado del dashboard">
        <div className="grid gap-2 md:grid-cols-5">
          {steps.map((step) => (
            <div
              key={step}
              className={`rounded-xl border p-3 text-xs font-semibold ${
                step === trace.current_step ? "border-[#0F4C81] bg-[#E6F0FA] text-[#0F4C81]" : "border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              {traceStepLabels[step]}
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card title="Validaciones iniciales" description="Knockouts y cliente existente antes de captura">
          <div className="space-y-3">
            {!ineApproved && (
              <Button type="button" variant="outline" onClick={() => navigate(`/originacion/${trace.trace_id}/ine`)}>
                Ir a carga y validación de INE
              </Button>
            )}
            {knockoutsApproved ? (
              <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">Knockouts aprobados</p>
            ) : (
              trace.current_step !== "captura_datos" && (
                <Button
                  disabled={!ineApproved || flowBlocked}
                  icon={<Play className="h-4 w-4" />}
                  loading={running}
                  type="button"
                  variant="secondary"
                  onClick={() => runAction(() => runKnockoutsValidation(trace.trace_id))}
                >
                  Ejecutar knockouts
                </Button>
              )
            )}
            {existingClientApproved ? (
              <p className="rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">Cliente existente aprobado/no encontrado</p>
            ) : existingClientRejected ? (
              <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800">Cliente existente rechazado</p>
            ) : (
              <Button
                disabled={!knockoutsApproved || flowBlocked}
                icon={<Search className="h-4 w-4" />}
                loading={running}
                type="button"
                variant="outline"
                onClick={() => runAction(() => runExistingClientInitialValidation(trace.trace_id))}
              >
                Validar cliente existente
              </Button>
            )}
            <p className="text-sm text-slate-500">
              La captura se habilita solo cuando INE, knockouts y cliente existente están aprobados.
            </p>
          </div>
        </Card>
        <Card title="Separación de experiencia" description="Este flujo corre fuera del dashboard">
          <p className="text-sm text-slate-500">
            El dashboard solo monitorea trazas y solicitudes. La ejecución asistida de originación permanece en este layout independiente.
          </p>
        </Card>
      </div>

      <div className="mt-5">
        <Card title="Captura de datos" description="Disponible después de validaciones iniciales aprobadas">
          {trace.application_id ? (
            <div className="rounded-xl bg-green-50 p-4">
              <p className="font-semibold text-green-800">Solicitud creada y ligada al trace_id.</p>
              <p className="mt-1 text-sm text-green-700">
                Puedes continuar a documentos en este flujo. El detalle de solicitud vive en el dashboard.
              </p>
              <Button className="mt-4" type="button" variant="secondary" onClick={() => navigate(`/originacion/${trace.trace_id}/documentos`)}>
                Ir a documentos
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  disabled={!canCreateApplication}
                  label={selectedPersonType === "moral" ? "Razón social" : "Nombre del prospecto"}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Input
                  disabled={!canCreateApplication}
                  label="Monto solicitado"
                  type="number"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
                <Select
                  disabled={!canCreateApplication}
                  label="Escenario"
                  options={scenarioOptions}
                  value={scenario}
                  onChange={(event) => setScenario(event.target.value as ApplicationScenario)}
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Monto a crear: <strong>{formatMoney(Number(amount || 0))}</strong></p>
                <Button
                  disabled={!canCreateApplication || Number(amount || 0) <= 0}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  loading={running}
                  type="button"
                  onClick={createLinkedApplication}
                >
                  Confirmar captura y crear pre-solicitud
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {isDocumentsStep && (
        <div className="mt-5">
          {application ? (
            <DocumentChecklist
              busyDocumentId={busyDocumentId}
              documents={application.documents}
              title="Expediente documental"
              description="Carga simulada de documentos según tipo de persona"
              onStatusChange={changeDocumentStatus}
              onUpload={uploadDocument}
            />
          ) : (
            <Card title="Documentos" description="Primero confirma la captura para crear la pre-solicitud.">
              <Button disabled={!canCreateApplication} type="button" onClick={createLinkedApplication}>
                Confirmar captura y crear pre-solicitud
              </Button>
            </Card>
          )}
        </div>
      )}

      <div className="mt-5">
        <TraceTimeline events={trace.events} />
      </div>
    </>
  );
}
