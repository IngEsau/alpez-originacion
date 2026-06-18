import { ArrowLeft, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSolicitudFlow } from "../features/solicitud/services/solicitudFlowService";
import type { SolicitudFlowState } from "../features/solicitud/types/solicitud.types";
import { Button } from "../shared/components/Button";

function formatDate(value?: string): string {
  if (!value) return new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export function SolicitudSuccessPage() {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const [flow, setFlow] = useState<SolicitudFlowState | null>(null);

  useEffect(() => {
    if (!flowId) return;
    void getSolicitudFlow(flowId).then(setFlow);
  }, [flowId]);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[760px] flex-col justify-center px-4 py-10 sm:px-6">
      <div className="rounded-[8px] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <span className="text-3xl font-bold">✓</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">Tu solicitud fue enviada</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
          Recibimos tu información. Un asesor revisará los datos y continuará con el proceso.
        </p>

        <div className="mx-auto mt-8 grid max-w-md gap-3 rounded-[8px] bg-slate-50 p-4 text-left">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">Folio</span>
            <span className="font-bold text-slate-950">{flow?.folio ?? "En proceso"}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">Fecha de envío</span>
            <span className="font-bold text-slate-950">{formatDate(flow?.submittedAt)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-slate-500">Estado</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">En revisión</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button icon={<ArrowLeft className="h-4 w-4" />} type="button" variant="outline" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
          <Button icon={<LogIn className="h-4 w-4" />} type="button" onClick={() => navigate("/login")}>
            Entrar al panel
          </Button>
        </div>
      </div>
    </section>
  );
}
