import { useEffect, useState } from "react";
import { FileImage, ShieldCheck } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { Trace } from "../features/traces/types/trace.types";
import {
  getTraceById,
  runIneInitialValidation,
  updateTraceIneUpload,
} from "../features/traces/services/traceService";
import { TraceTimeline } from "../features/traces/components/TraceTimeline";
import { TraceStatusBadge } from "../shared/components/Badge";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";
import { EmptyState } from "../shared/components/EmptyState";
import { PageHeader } from "../shared/components/PageHeader";
import { SkeletonCard } from "../shared/components/Skeleton";
import { personTypeLabels, traceStepLabels } from "../shared/lib/formatters";

function hasIneApproved(trace: Trace): boolean {
  return trace.events.some((event) => event.step === "ine_validacion_padron" && event.status === "success");
}

export function IneCapturePage() {
  const { traceId } = useParams();
  const navigate = useNavigate();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    if (!traceId) return;
    setLoading(true);
    try {
      setTrace(await getTraceById(traceId));
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!traceId) return;
    setTrace(await getTraceById(traceId));
  }

  async function runAction(action: () => Promise<unknown>) {
    setRunning(true);
    try {
      await action();
      await refresh();
    } finally {
      setRunning(false);
    }
  }

  async function validateIne() {
    if (!trace) return;
    setRunning(true);
    try {
      const result = await runIneInitialValidation(trace.trace_id);
      await refresh();
      if (result.status === "approved") {
        navigate(`/originacion/${trace.trace_id}`);
      }
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    void load();
  }, [traceId]);

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

  const ineReady = Boolean(trace.ine_front_loaded && trace.ine_back_loaded);
  const ineApproved = hasIneApproved(trace);
  const flowBlocked = ["failed", "rejected"].includes(trace.status);

  return (
    <>
      <PageHeader
        title="Carga de INE"
        description={`Trace ID: ${trace.trace_id}`}
        actions={<TraceStatusBadge status={trace.status} />}
      />

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card title="Paso actual">
          <p className="font-semibold text-slate-950">{traceStepLabels[trace.current_step]}</p>
          <p className="mt-2 text-sm text-slate-500">
            Tipo: {trace.person_type ? personTypeLabels[trace.person_type] : "No definido"}
          </p>
        </Card>
        <Card title="Frontal INE">
          <p className="text-sm text-slate-500">{trace.ine_front_loaded ? "frontal_ine.jpg cargado" : "Pendiente"}</p>
        </Card>
        <Card title="Reverso INE">
          <p className="text-sm text-slate-500">{trace.ine_back_loaded ? "reverso_ine.jpg cargado" : "Pendiente"}</p>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card title="Upload simulado" description="No usa OCR real ni servicios externos">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <FileImage className="mb-3 h-5 w-5 text-[#0F4C81]" />
              <p className="font-semibold text-slate-950">Frente INE</p>
              <p className="mt-1 text-sm text-slate-500">
                {trace.ine_front_loaded ? "Archivo cargado: frontal_ine.jpg" : "Simula la foto o carga frontal."}
              </p>
              <Button
                className="mt-4"
                disabled={flowBlocked || ineApproved}
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
                {trace.ine_back_loaded ? "Archivo cargado: reverso_ine.jpg" : "Simula la foto o carga del reverso."}
              </p>
              <Button
                className="mt-4"
                disabled={flowBlocked || ineApproved}
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
        </Card>

        <Card title="Validación simulada de INE" description="Calidad, vigencia y padrón">
          <div className="space-y-3">
            <Button
              disabled={!ineReady || flowBlocked || ineApproved}
              icon={<ShieldCheck className="h-4 w-4" />}
              loading={running}
              type="button"
              onClick={validateIne}
            >
              Validar INE
            </Button>
            {ineApproved && (
              <Button type="button" variant="outline" onClick={() => navigate(`/originacion/${trace.trace_id}`)}>
                Continuar a knockouts
              </Button>
            )}
            <p className="text-sm text-slate-500">
              Si la validación falla, el flujo se detiene y queda visible en la traza.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <TraceTimeline events={trace.events.slice(-6)} title="Eventos recientes de la traza" />
      </div>
    </>
  );
}
