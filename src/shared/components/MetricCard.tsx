import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  description,
  icon,
  onClick,
}: {
  label: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        <div className="rounded-xl bg-[#E6F0FA] p-3 text-[#0F4C81]">{icon}</div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#0F4C81] hover:bg-[#F5FAFF]"
        type="button"
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {content}
    </div>
  );
}
