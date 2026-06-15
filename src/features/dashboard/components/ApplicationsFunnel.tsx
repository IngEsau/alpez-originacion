import type { DashboardSummary } from "../../applications/types/application.types";
import { Card } from "../../../shared/components/Card";
import { applicationStatusLabels } from "../../../shared/lib/formatters";

const funnelStages = [
  "nueva",
  "captura_datos",
  "validacion_ine",
  "documentos_pendientes",
  "consulta_buro",
  "modelo_decision",
  "investigacion_legal",
  "contratos",
  "rechazada",
] as const;

export function ApplicationsFunnel({ summary }: { summary: DashboardSummary }) {
  const max = Math.max(...summary.byStatus.map((item) => item.count), 1);

  return (
    <Card title="Embudo de originación" description="Avance por etapas principales">
      <div className="space-y-3">
        {funnelStages.map((status) => {
          const count = summary.byStatus.find((item) => item.status === status)?.count ?? 0;
          const width = `${Math.max((count / max) * 100, count > 0 ? 12 : 4)}%`;
          return (
            <div key={status}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">{applicationStatusLabels[status]}</span>
                <span className="text-slate-500">{count}</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div className="h-2.5 rounded-full bg-[#0F4C81]" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
