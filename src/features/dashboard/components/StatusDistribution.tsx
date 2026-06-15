import type { DashboardSummary } from "../../applications/types/application.types";
import { Card } from "../../../shared/components/Card";
import { ApplicationScenarioBadge, ApplicationStatusBadge } from "../../../shared/components/Badge";

export function StatusDistribution({ summary }: { summary: DashboardSummary }) {
  return (
    <Card title="Distribución" description="Estados y escenarios del portafolio demo">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-slate-400">Por estado</p>
          {summary.byStatus.map((item) => (
            <div key={item.status} className="flex items-center justify-between rounded-xl bg-slate-50 p-2">
              <ApplicationStatusBadge status={item.status} />
              <span className="text-sm font-bold text-slate-950">{item.count}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-slate-400">Por escenario</p>
          {summary.byScenario.map((item) => (
            <div key={item.scenario} className="flex items-center justify-between rounded-xl bg-slate-50 p-2">
              <ApplicationScenarioBadge scenario={item.scenario} />
              <span className="text-sm font-bold text-slate-950">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
