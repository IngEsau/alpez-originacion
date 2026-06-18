import { useState } from "react";
import { ArrowRight, HelpCircle, LogIn, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";

export function PortalPage() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#0F4C81] text-base font-bold text-white">
            A
          </span>
          <span className="text-lg font-bold text-slate-950">ALPEZ</span>
        </div>
        <div className="flex items-center gap-2">
        <Button
          icon={<HelpCircle className="h-4 w-4" />}
          type="button"
          variant="ghost"
          onClick={() => setShowHelp(true)}
        >
          Ayuda
        </Button>
        <Button
          className="hidden sm:inline-flex"
          icon={<LogIn className="h-4 w-4" />}
          type="button"
          variant="outline"
          onClick={() => navigate("/login")}
        >
          Entrar al panel
        </Button>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F4C81] text-2xl font-bold text-white">
            A
          </div>
          <h1 className="text-4xl font-bold leading-tight text-slate-950 sm:text-6xl">
            Solicita tu línea de crédito en minutos
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">
            Completa tu información paso a paso. Te guiaremos durante todo el proceso.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              icon={<ArrowRight className="h-4 w-4" />}
              size="lg"
              type="button"
              onClick={() => navigate("/solicitud")}
            >
              Iniciar solicitud
            </Button>
            <Button
              icon={<ShieldCheck className="h-4 w-4" />}
              size="lg"
              type="button"
              variant="outline"
              onClick={() => setShowHelp(true)}
            >
              Ya tengo una solicitud
            </Button>
          </div>
          <p className="mt-5 text-sm font-medium text-slate-500">
            Tus datos se usan únicamente para revisar tu solicitud.
          </p>
        </div>
      </section>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <Card
            className="w-full max-w-md"
            title="Canal de ayuda"
            description="Un asesor puede orientarte sobre tu solicitud."
            actions={
              <Button size="sm" type="button" variant="ghost" onClick={() => setShowHelp(false)}>
                Cerrar
              </Button>
            }
          >
            <div className="space-y-2 text-sm text-slate-600">
              <p>Teléfono: 222 555 0100</p>
              <p>Correo: apoyo@alpez.mx</p>
              <p>Ten a la mano tu folio para recibir atención más rápido.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
