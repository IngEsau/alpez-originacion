import { BadgeDollarSign, ClipboardCheck, FileWarning, Gauge, Landmark, WalletCards } from "lucide-react";
import type { Application } from "../types/application.types";
import { ApplicationStatusBadge, RiskBadge } from "../../../shared/components/Badge";
import { MetricCard } from "../../../shared/components/MetricCard";
import { formatMoney, formatScore } from "../../../shared/lib/formatters";

export function ApplicationSummaryCards({ application }: { application: Application }) {
  const pendingDocuments = application.documents.filter((document) => document.required && document.status === "pendiente").length;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <MetricCard icon={<WalletCards className="h-5 w-5" />} label="Monto solicitado" value={formatMoney(application.requestedAmount)} />
      <MetricCard icon={<BadgeDollarSign className="h-5 w-5" />} label="Línea asignada" value={formatMoney(application.assignedCreditLine)} />
      <MetricCard icon={<Gauge className="h-5 w-5" />} label="Score" value={formatScore(application.bureauScore, application.finalScore)} />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Nivel de riesgo</p>
        <div className="mt-3">
          <RiskBadge riskLevel={application.riskLevel} />
        </div>
        <Landmark className="mt-4 h-5 w-5 text-[#0F4C81]" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Estado actual</p>
        <div className="mt-3">
          <ApplicationStatusBadge status={application.status} />
        </div>
        <ClipboardCheck className="mt-4 h-5 w-5 text-[#0F4C81]" />
      </div>
      <MetricCard icon={<FileWarning className="h-5 w-5" />} label="Docs pendientes" value={pendingDocuments} />
    </div>
  );
}
