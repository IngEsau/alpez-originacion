import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Trace } from "../features/traces/types/trace.types";
import { getTraceById } from "../features/traces/services/traceService";
import { TraceTimeline } from "../features/traces/components/TraceTimeline";
import { TraceEventStatusBadge, TraceStatusBadge } from "../shared/components/Badge";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";
import { EmptyState } from "../shared/components/EmptyState";
import { PageHeader } from "../shared/components/PageHeader";
import { SkeletonCard } from "../shared/components/Skeleton";
import { formatDateTime, personTypeLabels, traceStepLabels } from "../shared/lib/formatters";

export function TraceDetailPage() {
  const { traceId } = useParams();
  const navigate = useNavigate();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!traceId) return;
    void getTraceById(traceId)
      .then(setTrace)
      .finally(() => setLoading(false));
  }, [traceId]);

  const ineResult = useMemo(
    () => trace?.events.find((event) => event.step.startsWith("ine_validacion") && event.metadata),
    [trace],
  );
  const knockoutResult = useMemo(
    () => trace?.events.find((event) => event.step === "knockouts" && event.metadata),
    [trace],
  );

  if (loading) return <SkeletonCard />;

  if (!trace) {
    return (
      <EmptyState
        title="Traza no encontrada"
        description="El trace_id solicitado no existe en el store demo."
        action={<Button onClick={() => navigate("/trazas")}>Volver a trazas</Button>}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={trace.trace_id}
        description="Detalle técnico/operativo de la traza"
        actions={
          <>
            {trace.application_id && (
              <Button type="button" variant="secondary" onClick={() => navigate(`/solicitudes/${trace.application_id}`)}>
                Ver solicitud
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => navigate("/trazas")}>
              Volver a trazas
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <Card title="Estado">
          <TraceStatusBadge status={trace.status} />
        </Card>
        <Card title="Paso actual">
          <p className="font-semibold text-slate-950">{traceStepLabels[trace.current_step]}</p>
        </Card>
        <Card title="Solicitud">
          {trace.application_id ? (
            <Link className="font-bold text-[#0F4C81] hover:underline" to={`/solicitudes/${trace.application_id}`}>
              {trace.application_id}
            </Link>
          ) : (
            <p className="text-sm text-slate-500">Pendiente</p>
          )}
        </Card>
        <Card title="Tipo">
          <p className="font-semibold text-slate-950">{trace.person_type ? personTypeLabels[trace.person_type] : "N/A"}</p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card title="Resultado INE" description="Metadata de calidad, vigencia y padrón">
          {ineResult ? (
            <div className="space-y-3">
              <TraceEventStatusBadge status={ineResult.status} />
              <p className="text-sm text-slate-600">{ineResult.description}</p>
              <pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-50">
                {JSON.stringify(ineResult.metadata, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin resultado INE registrado.</p>
          )}
        </Card>
        <Card title="Resultado knockouts" description="Metadata de reglas eliminatorias">
          {knockoutResult ? (
            <div className="space-y-3">
              <TraceEventStatusBadge status={knockoutResult.status} />
              <p className="text-sm text-slate-600">{knockoutResult.description}</p>
              <pre className="overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-50">
                {JSON.stringify(knockoutResult.metadata, null, 2)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin resultado knockouts registrado.</p>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <TraceTimeline events={trace.events} title="Eventos completos" />
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Creada {formatDateTime(trace.created_at)} · Actualizada {formatDateTime(trace.updated_at)}
      </p>
    </>
  );
}
