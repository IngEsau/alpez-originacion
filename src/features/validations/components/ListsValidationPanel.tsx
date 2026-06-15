import { ClipboardCheck } from "lucide-react";
import { runListsValidation } from "../services/validationService";
import { ValidationActionCard } from "./ValidationActionCard";

export function ListsValidationPanel({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  return (
    <ValidationActionCard
      buttonLabel="Validar listas"
      icon={<ClipboardCheck className="h-4 w-4" />}
      title="Validación de listas"
      onRun={async () => {
        const result = await runListsValidation(applicationId);
        onDone();
        return result.message;
      }}
    />
  );
}
