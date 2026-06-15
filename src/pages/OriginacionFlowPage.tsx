import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileImage, Play, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ApplicationScenario, CreateApplicationPayload } from "../features/applications/types/application.types";
import type { Trace } from "../features/traces/types/trace.types";
import { createApplication } from "../features/applications/services/applicationService";
import {
  getTraceById,
  linkTraceApplication,
  runIneInitialValidation,
  runKnockoutsValidation,
  updateTraceIneUpload,
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
  "captura_datos",
  "documentos",
  "buro",
  "listas",
  "decision",
] as const;

function hasEvent(trace: Trace, title: string): boolean {
  return trace.events.some((event) => event.title === title);
}

function hasIneApproved(trace: Trace): boolean {
  return trace.events.some((event) => event.step.startsWith("ine_validacion") && event.status === "success");
}

function hasKnockoutsApproved(trace: Trace): boolean {
  return trace.events.some((event) => event.step === "knockouts" && event.status === "success");
}

export function OriginacionFlowPage() {
  const { traceId } = useParams();
  const navigate = useNavigate();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [scenario, setScenario] = useState<ApplicationScenario>("persona_fisica_hit_buro");
  const [name, setName] = useState("Prospecto Originación Demo");
  const [amount, setAmount] = useState("50000");

  async function load() {
    if (!traceId) return;
    setLoading(true);
    try {
      const nextTrace = await getTraceById(traceId);
      setTrace(nextTrace);
      if (nextTrace?.person_type === "moral") setScenario("persona_moral_hit_buro");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!traceId) return;
    setTrace(await getTraceById(traceId));
  }

  useEffect(() => {
    void load();
  }, [traceId]);

  const ineReady = Boolean(trace?.ine_front_loaded && trace.ine_back_loaded);
  const ineApproved = trace ? hasIneApproved(trace) : false;
  const knockoutsApproved = trace ? hasKnockoutsApproved(trace) : false;
  const flowBlocked = Boolean(trace && ["failed", "rejected"].includes(trace.status));
  const canCreateApplication = Boolean(trace && ineApproved && knockoutsApproved && !trace.application_id && !flowBlocked);

  const availableScenarioOptions = useMemo(() => {
    if (trace?.person_type === "moral") {
      return [
        { value: "persona_moral_hit_buro", label: "Persona Moral con hit Buró" },
        { value: "persona_moral_no_hit_buro", label: "Persona Moral sin hit Buró" },
      ];
    }
    return [{ value: "persona_fisica_hit_buro", label: "Persona Física con hit Buró" }];
  }, [trace?.person_type]);

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
    if (!trace || !trace.person_type) return;
    const requestedAmount = Number(amount || 0);
    const payload: CreateApplicationPayload =
      trace.person_type === "fisica"
        ? {
            trace_id: trace.trace_id,
            personType: "fisica",
            scenario: "persona_fisica_hit_buro",
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
      navigate(`/solicitudes/${application.id}`);
    });
  }

  if (loading) return <SkeletonCard />;

  if (!trace) {
    return (
      <EmptyState
        title="Traza no encontrada"
        description="El trace_id solicitado no existe en el store demo."
        action={<Button onClick={() => navigate("/originacion/nueva")}>Iniciar originación</Button>}
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
            <p className="text-sm text-slate-500">Paso: {traceStepLabels[trace.current_step]}</p>
            <p className="text-xs font-semibold text-slate-500">Tipo: {trace.person_type ? personTypeLabels[trace.person_type] : "No definido"}</p>
          </div>
        </Card>
        <Card title="Solicitud ligada">
          {trace.application_id ? (
            <Link className="font-bold text-[#0F4C81] hover:underline" to={`/solicitudes/${trace.application_id}`}>
              {trace.application_id}
            </Link>
          ) : (
            <p className="text-sm text-slate-500">Se creará después de INE y knockouts aprobados.</p>
          )}
        </Card>
        <Card title="Resultado de entrada">
          <p className="text-sm text-slate-500">
            {flowBlocked ? "El flujo está detenido por validación inicial." : ineApproved ? "INE aprobada. Continúa knockouts/captura." : "Carga INE para iniciar validación."}
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
        <Card title="Carga simulada de INE" description="Primer paso real del flujo de originación">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <FileImage className="mb-3 h-5 w-5 text-[#0F4C81]" />
              <p className="font-semibold text-slate-950">Frontal INE</p>
              <p className="mt-1 text-sm text-slate-500">
                {trace.ine_front_loaded ? "frontal_ine.jpg cargado" : "Pendiente de carga"}
              </p>
              <Button
                className="mt-4"
                disabled={flowBlocked}
                loading={running}
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => runAction(() => updateTraceIneUpload(trace.trace_id, "front"))}
              >
                Simular carga frontal
              </Button>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <FileImage className="mb-3 h-5 w-5 text-[#0F4C81]" />
              <p className="font-semibold text-slate-950">Reverso INE</p>
              <p className="mt-1 text-sm text-slate-500">
                {trace.ine_back_loaded ? "reverso_ine.jpg cargado" : "Pendiente de carga"}
              </p>
              <Button
                className="mt-4"
                disabled={flowBlocked}
                loading={running}
                size="sm"
                type="button"
                variant="secondary"
                onClick={() => runAction(() => updateTraceIneUpload(trace.trace_id, "back"))}
              >
                Simular carga reverso
              </Button>
            </div>
          </div>
          {ineReady && !hasEvent(trace, "Documentos INE listos para validación") && (
            <p className="mt-3 text-sm font-semibold text-amber-700">Frontal y reverso cargados.</p>
          )}
        </Card>

        <Card title="Validación inicial" description="Calidad, vigencia, padrón y knockouts simulados">
          <div className="space-y-3">
            <Button
              disabled={!ineReady || flowBlocked || ineApproved}
              icon={<ShieldCheck className="h-4 w-4" />}
              loading={running}
              type="button"
              onClick={() => runAction(() => runIneInitialValidation(trace.trace_id))}
            >
              Validar INE
            </Button>
            <Button
              disabled={!ineApproved || flowBlocked || knockoutsApproved}
              icon={<Play className="h-4 w-4" />}
              loading={running}
              type="button"
              variant="secondary"
              onClick={() => runAction(() => runKnockoutsValidation(trace.trace_id))}
            >
              Ejecutar knockouts
            </Button>
            <p className="text-sm text-slate-500">
              El botón para continuar se habilita solo cuando INE y knockouts están aprobados.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card title="Captura de datos" description="Disponible después de validación inicial aprobada">
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              disabled={!canCreateApplication}
              label={trace.person_type === "moral" ? "Razón social" : "Nombre del prospecto"}
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
              disabled={!canCreateApplication || trace.person_type === "fisica"}
              label="Escenario"
              options={availableScenarioOptions}
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
              Continuar a captura y crear solicitud
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <TraceTimeline events={trace.events} />
      </div>
    </>
  );
}
