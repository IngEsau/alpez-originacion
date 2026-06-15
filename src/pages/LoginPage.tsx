import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../shared/components/Button";
import { Input } from "../shared/components/Input";
import { createDemoSession } from "../shared/lib/session";

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    window.setTimeout(() => {
      createDemoSession();
      navigate("/dashboard", { replace: true });
    }, 350);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div>
        <h2 className="text-xl font-bold text-slate-950">Acceso demo</h2>
        <p className="mt-1 text-sm text-slate-500">Entra con cualquier dato para presentar el flujo MVP.</p>
      </div>
      <Input defaultValue="demo@alpez.local" label="Correo" name="email" type="email" />
      <Input defaultValue="demo" label="Contraseña" name="password" type="password" />
      <Button className="w-full" icon={<ArrowRight className="h-4 w-4" />} loading={loading} type="submit">
        Entrar al demo
      </Button>
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        No hay autenticación real, JWT ni roles productivos. La sesión se guarda localmente solo para la demo.
      </p>
    </form>
  );
}
