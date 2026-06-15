import { ShieldCheck } from "lucide-react";
import { runIneValidation } from "../services/validationService";
import { ValidationActionCard } from "./ValidationActionCard";

export function IneValidationPanel({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  return (
    <ValidationActionCard
      buttonLabel="Ejecutar INE"
      icon={<ShieldCheck className="h-4 w-4" />}
      title="Validación INE"
      onRun={async () => {
        const result = await runIneValidation(applicationId);
        onDone();
        return result.message;
      }}
    />
  );
}
