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
        <h2 className="text-xl font-bold text-slate-950">Acceso al panel</h2>
        <p className="mt-1 text-sm text-slate-500">Ingresa tus credenciales para continuar.</p>
      </div>
      <Input label="Correo" name="email" placeholder="nombre@empresa.com" type="email" />
      <Input label="Contraseña" name="password" placeholder="Ingresa tu contraseña" type="password" />
      <Button className="w-full" icon={<ArrowRight className="h-4 w-4" />} loading={loading} type="submit">
        Entrar al panel
      </Button>
      <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        Acceso exclusivo para personal autorizado de ALPEZ.
      </p>
    </form>
  );
}
