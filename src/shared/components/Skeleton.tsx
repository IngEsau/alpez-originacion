import { cx } from "../lib/formatters";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-slate-200", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-20" />
      <Skeleton className="mt-3 h-3 w-40" />
    </div>
  );
}
