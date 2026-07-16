import { Check, Copy, HelpCircle, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSolicitudFlow } from "../features/solicitud/services/solicitudFlowService";
import { AlpezLogo } from "../shared/components/AlpezLogo";
import { Button } from "../shared/components/Button";

export function SolicitudLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === "/" || location.pathname === "/solicitud";
  const flowId = location.pathname.match(/^\/solicitud\/([^/]+)/)?.[1];
  const [recoveryFolio, setRecoveryFolio] = useState("");
  const [showSavedDialog, setShowSavedDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!flowId) {
      setRecoveryFolio("");
      return;
    }
    void getSolicitudFlow(flowId).then((flow) => setRecoveryFolio(flow?.recoveryFolio ?? ""));
  }, [flowId]);

  useEffect(() => {
    if (!isLanding) return;

    setShowSavedDialog(false);
    setCopied(false);
  }, [isLanding]);

  useEffect(() => {
    const handleSaved = (event: Event) => {
      const detail = (event as CustomEvent<{ recoveryFolio?: string }>).detail;
      if (detail?.recoveryFolio) setRecoveryFolio(detail.recoveryFolio);
    };
    window.addEventListener("alpez:flow-saved", handleSaved);
    return () => window.removeEventListener("alpez:flow-saved", handleSaved);
  }, []);

  const saveAndExit = async () => {
    window.dispatchEvent(new CustomEvent("alpez:save-and-exit"));
    const saved = flowId ? await getSolicitudFlow(flowId) : null;
    if (saved?.recoveryFolio) setRecoveryFolio(saved.recoveryFolio);
    setCopied(false);
    setShowSavedDialog(true);
  };

  const copyFolio = async () => {
    if (!recoveryFolio) return;
    try {
      await navigator.clipboard.writeText(recoveryFolio);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const exitToLanding = () => {
    setShowSavedDialog(false);
    setCopied(false);
    navigate("/");
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#F7F9FC]">
      {!isLanding && (
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:min-h-16 sm:gap-3 sm:px-6">
            <button
              className="flex shrink-0 items-center gap-3 rounded-[10px] text-left text-slate-950 outline-none transition hover:text-[#0F4C81] focus:ring-2 focus:ring-[#E6F0FA]"
              type="button"
              onClick={() => navigate("/")}
            >
              <AlpezLogo className="h-9 w-auto shrink-0 sm:h-12" variant="horizontal" />
            </button>

            <div className="hidden items-center gap-2 sm:flex">
              <Button
                icon={<Home className="h-4 w-4" />}
                type="button"
                variant="ghost"
                onClick={() => void saveAndExit()}
              >
                Guardar y salir
              </Button>
              <Button
                icon={<HelpCircle className="h-4 w-4" />}
                type="button"
                variant="ghost"
                onClick={() => {
                  window.location.href = "mailto:apoyo@alpez.mx";
                }}
              >
                Ayuda
              </Button>
            </div>
            <div className="flex items-center gap-1 sm:hidden">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={() => void saveAndExit()}
              >
                <Home className="h-4 w-4 shrink-0" />
                Guardar
              </button>
              <button
                aria-label="Solicitar ayuda"
                className="flex h-10 w-10 items-center justify-center rounded-[10px] text-slate-700 transition hover:bg-slate-100"
                title="Ayuda"
                type="button"
                onClick={() => {
                  window.location.href = "mailto:apoyo@alpez.mx";
                }}
              >
                <HelpCircle className="h-5 w-5 shrink-0" />
              </button>
            </div>
          </div>
          {recoveryFolio && (
            <div className="break-words border-t border-slate-100 bg-[#F8FBFE] px-3 py-2 text-center text-[11px] leading-5 text-slate-600 sm:px-4 sm:text-xs">
              Folio para continuar después: <strong className="font-bold text-[#0F4C81]">{recoveryFolio}</strong>
            </div>
          )}
        </header>
      )}
      <main>
        <Outlet />
      </main>
      {showSavedDialog && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4">
          <div className="max-h-[calc(100dvh-0.75rem)] w-full max-w-md overflow-y-auto rounded-t-[16px] border border-slate-200 bg-white p-5 shadow-2xl sm:rounded-[16px] sm:p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-950">Tu avance quedó guardado</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Conserva este folio. Podrás continuar desde el mismo paso durante las próximas 48 horas.
            </p>
            <div className="mt-5 flex flex-col items-stretch gap-3 rounded-[10px] bg-[#F5FAFF] p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="break-all font-bold text-[#0F4C81]">{recoveryFolio}</span>
              <Button className="w-full sm:w-auto" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} size="sm" type="button" variant="outline" onClick={() => void copyFolio()}>
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <div className="mt-6 grid gap-3 sm:flex sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
              <Button type="button" variant="ghost" onClick={() => setShowSavedDialog(false)}>
                Seguir capturando
              </Button>
              <Button type="button" onClick={exitToLanding}>
                Salir al inicio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
