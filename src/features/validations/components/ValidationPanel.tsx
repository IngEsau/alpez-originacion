import type { Application } from "../../applications/types/application.types";
import { Card } from "../../../shared/components/Card";
import { ValidationStatusBadge } from "../../../shared/components/Badge";
import { BureauValidationPanel } from "./BureauValidationPanel";
import { IneValidationPanel } from "./IneValidationPanel";
import { KnockoutPanel } from "./KnockoutPanel";
import { ListsValidationPanel } from "./ListsValidationPanel";
import { SmsValidationPanel } from "./SmsValidationPanel";
import { runExistingClientValidation } from "../services/validationService";
import { ValidationActionCard } from "./ValidationActionCard";
import { Users } from "lucide-react";

export function ValidationPanel({ application, onRefresh }: { application: Application; onRefresh: () => void }) {
  return (
    <div className="space-y-5">
      <Card title="Validaciones" description="Panel de validaciones simuladas del flujo de originación">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {application.validations.map((validation) => (
            <div key={validation.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-950">{validation.label}</p>
                <ValidationStatusBadge status={validation.status} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{validation.detail ?? "Pendiente de ejecución demo."}</p>
            </div>
          ))}
        </div>
      </Card>
      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <IneValidationPanel applicationId={application.id} onDone={onRefresh} />
        <KnockoutPanel applicationId={application.id} onDone={onRefresh} />
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
        <SmsValidationPanel applicationId={application.id} onDone={onRefresh} />
        <BureauValidationPanel applicationId={application.id} onDone={onRefresh} />
        <ListsValidationPanel applicationId={application.id} onDone={onRefresh} />
      </div>
    </div>
  );
}
