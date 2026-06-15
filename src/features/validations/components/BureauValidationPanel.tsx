import { Search } from "lucide-react";
import { runBureauQuery } from "../services/validationService";
import { ValidationActionCard } from "./ValidationActionCard";

export function BureauValidationPanel({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  return (
    <ValidationActionCard
      buttonLabel="Consultar Buró"
      icon={<Search className="h-4 w-4" />}
      title="Consulta Buró"
      onRun={async () => {
        const result = await runBureauQuery(applicationId);
        onDone();
        return result.message;
      }}
    />
  );
}
