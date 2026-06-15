import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F4C81] text-lg font-bold text-white">
            A
          </div>
          <h1 className="text-3xl font-bold text-slate-950">ALPEZ</h1>
          <p className="mt-2 text-sm text-slate-500">Originación financiera en ambiente demo</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
