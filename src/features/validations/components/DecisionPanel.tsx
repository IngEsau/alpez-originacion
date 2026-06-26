import { useState } from "react";
import { BrainCircuit, Play } from "lucide-react";
import type { Application } from "../../applications/types/application.types";
import { runDecisionModel } from "../services/validationService";
import { ApplicationDecisionBadge, RiskBadge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Card } from "../../../shared/components/Card";
import { formatDateTime, formatMoney, formatScore, rejectionReasonLabels } from "../../../shared/lib/formatters";

export function DecisionPanel({ application, onRefresh }: { application: Application; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      await runDecisionModel(application.id);
      onRefresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Modelo de decisión"
      description="Resultado simulado, determinístico y no productivo"
      actions={
        <Button icon={<Play className="h-4 w-4" />} loading={loading} type="button" onClick={run}>
          Ejecutar modelo
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Decisión</p>
          <div className="mt-2">
            <ApplicationDecisionBadge decision={application.decision} />
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Score</p>
          <p className="mt-2 text-xl font-bold text-slate-950">{formatScore(application.bureauScore, application.finalScore)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Riesgo</p>
          <div className="mt-2">
            <RiskBadge riskLevel={application.riskLevel} />
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-bold uppercase text-slate-400">Línea sugerida</p>
          <p className="mt-2 text-xl font-bold text-slate-950">{formatMoney(application.assignedCreditLine)}</p>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-[#0F4C81]" />
          <p className="font-semibold text-slate-950">{application.decisionResult?.message ?? "Modelo pendiente de ejecución."}</p>
        </div>
        {application.rejectionReason && (
          <p className="mt-2 text-sm text-slate-600">Motivo: {rejectionReasonLabels[application.rejectionReason]}</p>
        )}
        {application.decisionResult?.evaluatedAt && (
          <p className="mt-2 text-xs text-slate-500">Evaluado: {formatDateTime(application.decisionResult.evaluatedAt)}</p>
        )}
      </div>
    </Card>
  );
}
