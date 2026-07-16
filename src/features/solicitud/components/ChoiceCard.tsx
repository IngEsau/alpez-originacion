import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cx } from "../../../shared/lib/formatters";

interface ChoiceCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected?: boolean;
  onClick: () => void;
}

export function ChoiceCard({ title, description, icon, selected = false, onClick }: ChoiceCardProps) {
  return (
    <button
      className={cx(
        "flex min-h-20 w-full min-w-0 items-center gap-3 rounded-[8px] border bg-white p-3 text-left transition hover:border-[#0F4C81] hover:bg-[#F5FAFF] sm:gap-4 sm:p-4",
        selected ? "border-[#0F4C81] ring-2 ring-[#E6F0FA]" : "border-slate-200",
      )}
      type="button"
      onClick={onClick}
    >
      {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#E6F0FA] text-[#0F4C81] sm:h-12 sm:w-12">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-slate-950">{title}</span>
        {description && <span className="mt-1 block text-sm leading-6 text-slate-500">{description}</span>}
      </span>
      {selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />}
    </button>
  );
}
