import { useState, type ReactNode } from "react";
import { Button } from "../../../shared/components/Button";

export function ValidationActionCard({
  title,
  buttonLabel,
  icon,
  onRun,
}: {
  title: string;
  buttonLabel: string;
  icon: ReactNode;
  onRun: () => Promise<string>;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    try {
      setMessage(await onRun());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[#0F4C81]">{icon}</span>
        <h3 className="font-semibold text-slate-950">{title}</h3>
      </div>
      <Button loading={loading} size="sm" type="button" variant="secondary" onClick={run}>
        {buttonLabel}
      </Button>
      {message && <p className="mt-2 text-xs font-semibold text-slate-600">{message}</p>}
    </div>
  );
}
