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

export function SolicitudSuccessPage() {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const [flow, setFlow] = useState<SolicitudFlowState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flowId) {
      setLoading(false);
      return;
    }
    void getSolicitudFlow(flowId)
      .then(async (result) => {
        setFlow(result);
        if (result?.publicCreditResult && !result.publicResultDisplayedAt) {
          setFlow(await markPublicResultDisplayed(flowId));
        }
      })
      .finally(() => setLoading(false));
  }, [flowId]);

  if (loading) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[760px] flex-col justify-center px-4 py-10 sm:px-6">
        <ProgressBar current={11} total={11} />
        <div className="rounded-[8px] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
          <p className="font-semibold text-slate-600">Cargando resultado</p>
        </div>
      </section>
    );
  }

  if (!flow) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[760px] flex-col justify-center px-4 py-10 sm:px-6">
        <div className="rounded-[8px] bg-white p-6 text-center shadow-sm ring-1 ring-slate-200 sm:p-10">
          <h1 className="text-3xl font-bold text-slate-950">No encontramos tu solicitud</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
            El folio puede haber vencido. Puedes volver al inicio y generar una nueva solicitud.
          </p>
          <Button className="mt-6" icon={<ArrowLeft className="h-4 w-4" />} type="button" variant="outline" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </div>
      </section>
    );
  }

  const approved = flow.publicCreditResult === "approved";
  const title = approved ? "Tu solicitud fue recibida correctamente" : "Gracias por compartir tu información";
  const mainMessage = approved
    ? "Estamos revisando tu información. Un asesor se pondrá en contacto contigo para continuar con el proceso."
    : "Por el momento no podemos continuar con tu solicitud.";
  const secondaryMessage = approved
    ? ""
    : "Agradecemos el tiempo que dedicaste al proceso.";

  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[760px] flex-col justify-center px-4 py-10 sm:px-6">
      <ProgressBar current={11} total={11} />
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

        {secondaryMessage && <p className="mx-auto mt-6 max-w-xl text-sm font-semibold text-slate-500">{secondaryMessage}</p>}

        {(flow.folio || flow.submittedAt) && (
          <div className="mx-auto mt-8 grid max-w-md gap-3 rounded-[8px] bg-slate-50 p-4 text-left">
            {flow.folio && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-slate-500">Folio</span>
                <span className="font-bold text-slate-950">{flow.folio}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">Fecha de envío</span>
              <span className="font-bold text-slate-950">{formatDate(flow.submittedAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-500">Estado</span>
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${approved ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {approved ? "En revisión" : "Finalizada"}
              </span>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button icon={<ArrowLeft className="h-4 w-4" />} type="button" variant="outline" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
        </div>
      </div>
    </section>
  );
}
