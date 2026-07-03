import { ClipboardCheck, GitBranch, LayoutDashboard, LogOut, Menu, Play } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlpezLogo } from "../shared/components/AlpezLogo";
import { Button } from "../shared/components/Button";
import { cx } from "../shared/lib/formatters";
import { destroyDemoSession, getDemoSession } from "../shared/lib/session";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Solicitudes", to: "/solicitudes", icon: ClipboardCheck },
  { label: "Trazas", to: "/trazas", icon: GitBranch },
];

const pageTitles: Array<{ match: (pathname: string) => boolean; title: string }> = [
  { match: (pathname) => pathname === "/dashboard", title: "Dashboard operativo" },
  { match: (pathname) => pathname === "/solicitudes", title: "Solicitudes" },
  { match: (pathname) => pathname.startsWith("/solicitudes/"), title: "Detalle de solicitud" },
  { match: (pathname) => pathname === "/trazas", title: "Trazas" },
  { match: (pathname) => pathname.startsWith("/trazas/"), title: "Detalle de traza" },
];

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getDemoSession();
  const title = pageTitles.find((item) => item.match(location.pathname))?.title ?? "ALPEZ";

  function logout() {
    destroyDemoSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-[#F6F8FB] text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] border-r border-slate-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-center gap-3">
              <AlpezLogo className="h-12" variant="horizontal" />
              <div>
                <p className="text-xs text-slate-500">Dashboard</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    cx(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                      isActive ? "bg-[#E6F0FA] text-[#0F4C81]" : "text-slate-600 hover:bg-slate-100",
                    )
                  }
                  to={item.to}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="space-y-3 border-t border-slate-200 p-4">
            <Button
              className="w-full"
              icon={<Play className="h-4 w-4" />}
              type="button"
              variant="secondary"
              onClick={() => navigate("/solicitud")}
            >
              Iniciar originación
            </Button>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">Ambiente</p>
              <p className="text-sm font-bold text-slate-950">Demo local</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" type="button">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-bold text-slate-950">{title}</p>
              <p className="hidden text-xs text-slate-500 sm:block">Monitoreo operativo | Ambiente Demo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              className="hidden sm:inline-flex"
              icon={<Play className="h-4 w-4" />}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => navigate("/solicitud")}
            >
              Iniciar originación
            </Button>
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-slate-950">{user?.name ?? "Ejecutivo Demo"}</p>
              <p className="text-xs text-slate-500">Administrador demo</p>
            </div>
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" type="button" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
