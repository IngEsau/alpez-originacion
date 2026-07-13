import { useEffect, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Trace } from "../features/traces/types/trace.types";
import { getTraces } from "../features/traces/services/traceService";
import { TraceStatusBadge } from "../shared/components/Badge";
import { Button } from "../shared/components/Button";
import { EmptyState } from "../shared/components/EmptyState";
import { PageHeader } from "../shared/components/PageHeader";
import { Skeleton } from "../shared/components/Skeleton";
import { formatDateTime, personTypeLabels, traceStepLabels } from "../shared/lib/formatters";

export function TracesPage() {
  const navigate = useNavigate();
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getTraces()
      .then(setTraces)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Seguimientos"
        description="Monitoreo de los procesos de originación"
        actions={
          <Button icon={<Plus className="h-4 w-4" />} type="button" onClick={() => navigate("/solicitud")}>
            Iniciar originación
          </Button>
        }
      />
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-3 h-12 w-full" />
        </div>
      )}
      {!loading && traces.length === 0 && (
        <EmptyState
          title="No hay seguimientos registrados"
          description="Inicia una originación para generar el primer seguimiento."
          action={<Button onClick={() => navigate("/solicitud")}>Iniciar originación</Button>}
        />
      )}
      {!loading && traces.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Paso actual</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Solicitud</th>
                <th className="px-4 py-3">Actualización</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody>
              {traces.map((trace, index) => (
                <tr key={trace.trace_id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-[#0F4C81]">Seguimiento {String(index + 1).padStart(2, "0")}</td>
                  <td className="px-4 py-3"><TraceStatusBadge status={trace.status} /></td>
                  <td className="px-4 py-3 text-slate-600">{traceStepLabels[trace.current_step]}</td>
                  <td className="px-4 py-3 text-slate-600">{trace.person_type ? personTypeLabels[trace.person_type] : "N/A"}</td>
                  <td className="px-4 py-3 text-slate-600">{trace.application_id ?? "Pendiente"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(trace.updated_at)}</td>
                  <td className="px-4 py-3">
                    <Button
                      icon={<ArrowRight className="h-4 w-4" />}
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => navigate(`/trazas/${trace.trace_id}`)}
                    >
                      Ver seguimiento
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
