import { AlertTriangle } from "lucide-react";
import { runKnockoutValidation } from "../services/validationService";
import { ValidationActionCard } from "./ValidationActionCard";

export function KnockoutPanel({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  return (
    <ValidationActionCard
      buttonLabel="Ejecutar knockouts"
      icon={<AlertTriangle className="h-4 w-4" />}
      title="Knockouts"
      onRun={async () => {
        const result = await runKnockoutValidation(applicationId);
        onDone();
        return result.passed ? "Reglas knockout aprobadas." : result.reasons.join(", ");
      }}
    />
  );
}
