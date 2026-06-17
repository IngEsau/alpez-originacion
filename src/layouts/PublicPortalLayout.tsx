import { Outlet } from "react-router-dom";

export function PublicPortalLayout() {
  return (
    <main className="min-h-screen bg-[#F6F8FB] text-slate-950">
      <Outlet />
    </main>
  );
}
