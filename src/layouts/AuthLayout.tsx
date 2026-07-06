import { Outlet } from "react-router-dom";
import { AlpezLogo } from "../shared/components/AlpezLogo";

export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F8FB] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <AlpezLogo className="mx-auto mb-3 h-24" variant="horizontal" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
