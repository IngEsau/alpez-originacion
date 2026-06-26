import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSolicitudFlow, markPublicResultDisplayed } from "../features/solicitud/services/solicitudFlowService";
import type { SolicitudFlowState } from "../features/solicitud/types/solicitud.types";
import { Button } from "../shared/components/Button";
import { ProgressBar } from "../features/solicitud/components/ProgressBar";

function formatDate(value?: string): string {
  if (!value) return new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  return new Date(value).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

function money(value: number | null | undefined): string {
  if (!value) return "$0";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function SolicitudSuccessPage() {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const [flow, setFlow] = useState<SolicitudFlowState | null>(null);

  useEffect(() => {
    if (!flowId) return;
    void getSolicitudFlow(flowId).then(async (result) => {
      setFlow(result);
      if (result?.creditEvaluation && !result.publicResultDisplayedAt) {
        setFlow(await markPublicResultDisplayed(flowId));
      }
    });
  }, [flowId]);

  if (!flow) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[760px] flex-col justify-center px-4 py-10 sm:px-6">
        <ProgressBar current={12} total={12} />
        <div className="rounded-[8px] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
          <p className="font-semibold text-slate-600">Cargando resultado</p>
        </div>
      </section>
    );
  }

  const approved = flow?.creditEvaluation?.decision === "approved";
  const documentsComplete = Boolean(flow?.creditEvaluation?.documentsComplete);
  const title = approved ? "¡Tu solicitud fue aprobada!" : "Gracias por compartir tu información";
  const mainMessage = approved
    ? "Con la información proporcionada, podemos continuar con tu solicitud."
    : "Por el momento no podemos continuar con tu solicitud.";
  const secondaryMessage = approved
    ? documentsComplete
      ? "Un asesor se pondrá en contacto contigo para explicarte los siguientes pasos."
      : "Aún necesitamos completar algunos documentos. Un asesor se pondrá en contacto contigo para ayudarte a terminar el proceso."
    : "Agradecemos el tiempo que dedicaste al proceso.";
  const infoMessage = approved
    ? documentsComplete
      ? "Mantén disponible el número de celular que registraste."
      : "No necesitas volver a iniciar la solicitud."
    : "Más adelante podrás consultar nuevamente las opciones disponibles.";

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[760px] flex-col justify-center px-4 py-10 sm:px-6">
      <ProgressBar current={12} total={12} />
      <div className="rounded-[8px] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
        <div
          className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
            approved ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          <span className="text-3xl font-bold">{approved ? "✓" : "i"}</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">{mainMessage}</p>

        {approved && (
          <div className="mx-auto mt-8 max-w-sm rounded-[8px] bg-[#F5FAFF] p-5">
            <p className="text-sm font-bold uppercase text-slate-500">Línea aprobada</p>
            <p className="mt-2 text-3xl font-bold text-[#0F4C81]">
              {money(flow?.creditEvaluation?.approvedCreditLine)}
            </p>
          </div>
        )}

        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600">{secondaryMessage}</p>
        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">{infoMessage}</p>

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
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${approved ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {approved ? "Aprobada" : "Finalizada"}
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button icon={<ArrowLeft className="h-4 w-4" />} type="button" variant="outline" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </div>
      </div>
    </section>
  );
}
