import type { Application } from "../../applications/types/application.types";
import { Card } from "../../../shared/components/Card";
import { Badge } from "../../../shared/components/Badge";
import { BureauValidationPanel } from "./BureauValidationPanel";
import { IneValidationPanel } from "./IneValidationPanel";
import { KnockoutPanel } from "./KnockoutPanel";
import { ListsValidationPanel } from "./ListsValidationPanel";
import { SmsValidationPanel } from "./SmsValidationPanel";
import { runExistingClientValidation } from "../services/validationService";
import { ValidationActionCard } from "./ValidationActionCard";
import { Users } from "lucide-react";
import { deriveValidationSummary } from "../utils/validationSummary";
import { formatDateTime } from "../../../shared/lib/formatters";

function SummaryStatusBadge({ status }: { status: ReturnType<typeof deriveValidationSummary>[number]["status"] }) {
  if (status === "completed") return <Badge tone="success">Completada</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rechazada</Badge>;
  if (status === "observed") return <Badge tone="warning">Observada</Badge>;
  return <Badge>Pendiente</Badge>;
}

function completionMessage(item: ReturnType<typeof deriveValidationSummary>[number]) {
  if (item.status !== "completed" && item.status !== "rejected") return null;
  const source = item.source === "public_onboarding" || item.source === "backfill"
    ? "Completada en canal autoasistido"
    : "Completada en panel interno";
  return item.completedAt ? `${source} · ${formatDateTime(item.completedAt)}` : source;
}

export function ValidationPanel({ application, onRefresh }: { application: Application; onRefresh: () => void }) {
  const summary = deriveValidationSummary(application);
  const byType = new Map(summary.map((item) => [item.type, item]));
  const canRun = (type: string) => {
    const item = byType.get(type as never);
    return !item || item.status === "pending" || item.status === "observed";
  };

  return (
    <div className="space-y-5">
      <Card title="Validaciones" description="Panel de validaciones simuladas del flujo de originación">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.map((validation) => (
            <div key={validation.type} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-950">{validation.label}</p>
                <SummaryStatusBadge status={validation.status} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{validation.detail}</p>
              {completionMessage(validation) && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">{completionMessage(validation)}</p>
              )}
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {canRun("ine") && <IneValidationPanel applicationId={application.id} onDone={onRefresh} />}
        {canRun("knockouts") && <KnockoutPanel applicationId={application.id} onDone={onRefresh} />}
        {canRun("cliente_existente") && (
          <ValidationActionCard
            buttonLabel="Validar cliente"
            icon={<Users className="h-4 w-4" />}
            title="Cliente existente"
            onRun={async () => {
              const result = await runExistingClientValidation(application.id);
              onRefresh();
              return result.message;
            }}
          />
        )}
        {canRun("sms") && <SmsValidationPanel applicationId={application.id} onDone={onRefresh} />}
        {canRun("buro") && <BureauValidationPanel applicationId={application.id} onDone={onRefresh} />}
        {canRun("listas") && <ListsValidationPanel applicationId={application.id} onDone={onRefresh} />}
      </div>
    </div>
  );
}
