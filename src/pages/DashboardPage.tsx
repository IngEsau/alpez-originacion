import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileWarning, GitBranch, ListChecks, WalletCards } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { DashboardSummary } from "../features/applications/types/application.types";
import { getDashboardSummary } from "../features/applications/services/applicationService";
import type { Trace, TraceEvent } from "../features/traces/types/trace.types";
import { getTraces } from "../features/traces/services/traceService";
import { ApplicationsFunnel } from "../features/dashboard/components/ApplicationsFunnel";
import { DashboardHeader } from "../features/dashboard/components/DashboardHeader";
import { RecentApplicationsTable } from "../features/dashboard/components/RecentApplicationsTable";
import { StatusDistribution } from "../features/dashboard/components/StatusDistribution";
import { TraceEventStatusBadge, TraceStatusBadge } from "../shared/components/Badge";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";
import { EmptyState } from "../shared/components/EmptyState";
import { MetricCard } from "../shared/components/MetricCard";
import { SkeletonCard } from "../shared/components/Skeleton";
import { formatDateTime, formatMoney, personTypeLabels, traceStepLabels } from "../shared/lib/formatters";

export function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [nextSummary, nextTraces] = await Promise.all([getDashboardSummary(), getTraces()]);
      setSummary(nextSummary);
      setTraces(nextTraces);
    } catch {
      setError("No se pudo cargar el dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <>
        <DashboardHeader />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <DashboardHeader />
        <EmptyState title={error} description="Reintenta cargar las métricas locales." action={<Button onClick={load}>Reintentar</Button>} />
      </>
    );
  }

  if (!summary || summary.totalApplications === 0) {
    return (
      <>
        <DashboardHeader />
        <EmptyState
          title="Aún no hay solicitudes registradas"
          description="Crea una nueva solicitud para iniciar el flujo de originación."
        />
      </>
    );
  }

  const latestEvents: Array<TraceEvent & { trace_id: string }> = traces
    .flatMap((trace) => trace.events.map((event) => ({ ...event, trace_id: trace.trace_id })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <>
      <DashboardHeader />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<WalletCards className="h-5 w-5" />} label="Total solicitudes" value={summary.totalApplications} />
        <MetricCard icon={<Clock className="h-5 w-5" />} label="Solicitudes en proceso" value={summary.runningApplications} />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Aprobadas" value={summary.approved} description={formatMoney(summary.totalAssignedCreditLine)} />
        <MetricCard icon={<AlertTriangle className="h-5 w-5" />} label="Rechazadas" value={summary.rejected} description={formatMoney(summary.totalRequestedAmount)} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <MetricCard icon={<GitBranch className="h-5 w-5" />} label="Seguimientos generados" value={summary.totalTraces} />
        <MetricCard icon={<ListChecks className="h-5 w-5" />} label="Seguimientos en proceso" value={summary.runningTraces} />
        <MetricCard icon={<FileWarning className="h-5 w-5" />} label="Seguimientos con incidencia" value={summary.failedTraces} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <ApplicationsFunnel summary={summary} />
        <StatusDistribution summary={summary} />
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card
          title="Seguimientos recientes"
          description="Monitoreo de los procesos de originación"
          actions={
            <Button size="sm" type="button" variant="outline" onClick={() => navigate("/trazas")}>
              Ver seguimientos
            </Button>
          }
        >
          <div className="space-y-3">
            {traces.slice(0, 5).map((trace) => (
              <Link
                key={trace.trace_id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                to={`/trazas/${trace.trace_id}`}
              >
                <div>
                  <p className="font-bold text-[#0F4C81]">{trace.person_type ? personTypeLabels[trace.person_type] : "Originación"}</p>
                  <p className="text-xs text-slate-500">{traceStepLabels[trace.current_step]}</p>
                </div>
                <TraceStatusBadge status={trace.status} />
              </Link>
            ))}
          </div>
        </Card>
        <Card title="Últimos eventos" description="Actividad reciente de originación">
          <div className="space-y-3">
            {latestEvents.map((event) => (
              <Link
                key={event.id}
                className="block rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                to={`/trazas/${event.trace_id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{event.title}</p>
                  <TraceEventStatusBadge status={event.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDateTime(event.created_at)}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-5">
        <RecentApplicationsTable applications={summary.recentApplications} />
      </div>
    </>
  );
}
