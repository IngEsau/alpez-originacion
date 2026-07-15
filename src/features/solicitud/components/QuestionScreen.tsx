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
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[760px] flex-col justify-center px-4 py-10 sm:px-6">
      <ProgressBar current={step} total={totalSteps} />
      <div className={cx("rounded-[8px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8", className)}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{title}</h1>
          {description && <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">{description}</p>}
          {feedback && (
            <div className="mt-4 rounded-[8px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-700" role="alert">
              {feedback}
            </div>
          )}
        </div>
        <div>{children}</div>
        {actions && <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">{actions}</div>}
      </div>
    </section>
  );
}
