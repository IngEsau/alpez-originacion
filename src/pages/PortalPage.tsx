import { useState } from "react";
import { HelpCircle, LogIn, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../shared/components/Button";
import { Card } from "../shared/components/Card";

export function PortalPage() {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 lg:px-6">
        <Button
          icon={<HelpCircle className="h-4 w-4" />}
          type="button"
          variant="ghost"
          onClick={() => setShowHelp(true)}
        >
          Contacto / Ayuda
        </Button>
        <Button
          icon={<LogIn className="h-4 w-4" />}
          type="button"
          variant="outline"
          onClick={() => navigate("/login")}
        >
          Login para dashboard
        </Button>
      </header>

      <section className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F4C81] text-2xl font-bold text-white">
            A
          </div>
          <h1 className="text-5xl font-bold text-slate-950">ALPEZ</h1>
          <p className="mt-3 text-lg font-semibold text-[#0F4C81]">Demo</p>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-500">
            Portal de entrada para originación asistida y monitoreo operativo del MVP.
          </p>
          <div className="mt-8">
            <Button
              icon={<Play className="h-4 w-4" />}
              size="lg"
              type="button"
              onClick={() => navigate("/originacion/iniciar")}
            >
              Iniciar originación
            </Button>
          </div>
        </div>
      </section>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <Card
            className="w-full max-w-md"
            title="Canal de apoyo demo"
            description="Información simulada para la presentación MVP"
            actions={
              <Button size="sm" type="button" variant="ghost" onClick={() => setShowHelp(false)}>
                Cerrar
              </Button>
            }
          >
            <div className="space-y-2 text-sm text-slate-600">
              <p>Teléfono demo: 222 555 0100</p>
              <p>Correo demo: apoyo@alpez.demo</p>
              <p>No se integra WhatsApp, correo real ni servicios externos.</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
