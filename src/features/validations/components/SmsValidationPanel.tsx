import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { sendSmsCode, verifySmsCode } from "../services/validationService";
import { Button } from "../../../shared/components/Button";
import { Input } from "../../../shared/components/Input";

export function SmsValidationPanel({ applicationId, onDone }: { applicationId: string; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    try {
      const result = await sendSmsCode(applicationId);
      setDemoCode(result.code);
      setMessage(result.message);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    setLoading(true);
    try {
      const result = await verifySmsCode(applicationId, code);
      setMessage(result.message);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-[#0F4C81]" />
        <h3 className="font-semibold text-slate-950">SMS</h3>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button loading={loading} size="sm" type="button" variant="secondary" onClick={send}>
          Enviar SMS
        </Button>
        <Input
          className="h-8"
          placeholder="123456"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <Button disabled={!code} loading={loading} size="sm" type="button" variant="outline" onClick={verify}>
          Validar código
        </Button>
      </div>
      {demoCode && <p className="mt-2 text-xs text-slate-500">Código demo: {demoCode}</p>}
      {message && <p className="mt-2 text-xs font-semibold text-slate-600">{message}</p>}
    </div>
  );
}
