import type { ReactNode } from "react";
import { cx } from "../../../shared/lib/formatters";
import { ProgressBar } from "./ProgressBar";

interface QuestionScreenProps {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  feedback?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function QuestionScreen({
  step,
  totalSteps,
  title,
  description,
  feedback,
  children,
  actions,
  className,
}: QuestionScreenProps) {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-[820px] min-w-0 flex-col justify-start px-3 py-5 sm:min-h-[calc(100dvh-4rem)] sm:px-6 sm:py-8 md:justify-center lg:py-10">
      <ProgressBar current={step} total={totalSteps} />
      <div className={cx("min-w-0 rounded-[8px] bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-8", className)}>
        <div className="mb-6 sm:mb-8">
          <h1 className="break-words text-[1.75rem] font-bold leading-tight text-slate-950 sm:text-4xl">{title}</h1>
          {description && <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>}
          {feedback && (
            <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700" role="alert">
              {feedback}
            </div>
          )}
        </div>
        <div className="min-w-0">{children}</div>
        {actions && (
          <div className="mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
