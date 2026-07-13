import { useNavigate } from "react-router-dom";
import { Button } from "../shared/components/Button";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] p-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-[#0F4C81]">404</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Página no encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">La página solicitada no está disponible.</p>
        <Button className="mt-6" type="button" onClick={() => navigate("/dashboard")}>
          Volver al dashboard
        </Button>
      </div>
    </main>
  );
}
