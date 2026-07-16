interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const percent = Math.round((current / total) * 100);

  return (
    <div className="mb-5 sm:mb-8">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500 sm:text-sm">
        <span>
          Paso {current} de {total}
        </span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-[#0F4C81] transition-all duration-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
