import { HelpCircle, Home, LogIn } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "../shared/components/Button";

export function SolicitudLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            className="flex items-center gap-3 rounded-[10px] text-left text-slate-950 outline-none transition hover:text-[#0F4C81] focus:ring-2 focus:ring-[#E6F0FA]"
            type="button"
            onClick={() => navigate("/")}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#0F4C81] text-base font-bold text-white">
              A
            </span>
            <span className="text-lg font-bold">ALPEZ</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              className="hidden sm:inline-flex"
              icon={<Home className="h-4 w-4" />}
              type="button"
              variant="ghost"
              onClick={() => navigate("/")}
            >
              Guardar y salir
            </Button>
            <Button
              className="hidden sm:inline-flex"
              icon={<HelpCircle className="h-4 w-4" />}
              type="button"
              variant="ghost"
            >
              Ayuda
            </Button>
            <Button
              icon={<LogIn className="h-4 w-4" />}
              type="button"
              variant="outline"
              onClick={() => navigate("/login")}
            >
              Entrar al panel
            </Button>
          </div>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
