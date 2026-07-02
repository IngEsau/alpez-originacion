import { BadgeDollarSign, ClipboardCheck, FileWarning, Gauge, Landmark, WalletCards } from "lucide-react";
import type { Application } from "../types/application.types";
import type { DocumentSummary, InternalWorkflowState } from "../types/application.types";
import { RiskBadge } from "../../../shared/components/Badge";
import { MetricCard } from "../../../shared/components/MetricCard";
import { formatMoney, formatScore } from "../../../shared/lib/formatters";
import { documentsToAttend } from "../utils/workflowState";

export function ApplicationSummaryCards({
  application,
  documentSummary,
  workflow,
  onDocumentsClick,
}: {
  application: Application;
  documentSummary: DocumentSummary;
  workflow: InternalWorkflowState;
  onDocumentsClick?: () => void;
}) {
  const suggestedLine = application.creditEvaluation?.suggestedCreditLine ?? application.assignedCreditLine;
  const amountWarning = suggestedLine !== null && suggestedLine !== undefined && application.requestedAmount > suggestedLine
    ? "El monto solicitado excede la línea sugerida por score."
    : undefined;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <MetricCard
        description={amountWarning}
        icon={<WalletCards className="h-5 w-5" />}
        label="Monto solicitado"
        value={formatMoney(application.requestedAmount)}
      />
      <MetricCard icon={<BadgeDollarSign className="h-5 w-5" />} label="Línea sugerida por score" value={formatMoney(application.assignedCreditLine)} />
      <MetricCard icon={<Gauge className="h-5 w-5" />} label="Score" value={formatScore(application.bureauScore, application.finalScore)} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Rango de riesgo</p>
        <div className="mt-3">
          <RiskBadge riskLevel={application.riskLevel} />
        </div>
        <Landmark className="mt-4 h-5 w-5 text-[#0F4C81]" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Estado operativo</p>
        <p className="mt-2 text-base font-bold text-slate-950">{workflow.label}</p>
        <ClipboardCheck className="mt-4 h-5 w-5 text-[#0F4C81]" />
      </div>
      <MetricCard
        description="Faltantes, por revisar o con cambio solicitado"
        icon={<FileWarning className="h-5 w-5" />}
        label="Documentos por atender"
        value={documentsToAttend(documentSummary)}
        onClick={onDocumentsClick}
      />
    </div>
  );
}
