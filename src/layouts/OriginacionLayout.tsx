import { ArrowLeft, Home } from "lucide-react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "../shared/components/Button";
import { AlpezLogo } from "../shared/components/AlpezLogo";
import { traceStepLabels } from "../shared/lib/formatters";

const progressSteps = [
  { match: "/ine", label: "Carga INE", step: "ine_carga" },
  { match: "", label: "Validaciones", step: "knockouts" },
  { match: "/captura", label: "Captura", step: "captura_datos" },
  { match: "/documentos", label: "Documentos", step: "documentos" },
  { match: "/buro", label: "SMS/Buró", step: "buro" },
  { match: "/listas", label: "Listas", step: "listas" },
  { match: "/decision", label: "Decisión", step: "decision" },
  { match: "/resumen", label: "Resumen", step: "finalizado" },
] as const;

export function OriginacionLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { traceId } = useParams();
  const currentIndex = traceId
    ? Math.max(
        progressSteps.findIndex((item) =>
          item.match ? location.pathname.endsWith(item.match) : location.pathname === `/originacion/${traceId}`,
        ),
        0,
      )
    : 0;

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <AlpezLogo className="h-12" variant="horizontal" />
              <div>
                <p className="text-xs text-slate-500">Originación asistida</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {traceId && (
                <span className="rounded-full bg-[#E6F0FA] px-3 py-1 text-xs font-bold text-[#0F4C81]">
                  Trace ID: {traceId}
                </span>
              )}
              <Button
                icon={<Home className="h-4 w-4" />}
                size="sm"
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
              >
                Volver al portal
              </Button>
            </div>
          </div>
          {traceId && (
            <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
              {progressSteps.map((item, index) => (
                <div
                  key={item.step}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                    index <= currentIndex
                      ? "border-[#0F4C81] bg-[#E6F0FA] text-[#0F4C81]"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {index + 1}. {item.label}
                  <span className="block font-normal">{traceStepLabels[item.step]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <div className="mb-5">
          <Button
            icon={<ArrowLeft className="h-4 w-4" />}
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
          >
            Regresar
          </Button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
