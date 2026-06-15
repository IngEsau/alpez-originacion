import type { TextareaHTMLAttributes } from "react";
import { cx } from "../lib/formatters";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Textarea({ label, error, helperText, className, id, required, ...props }: TextareaProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </span>
      )}
      <textarea
        id={inputId}
        className={cx(
          "min-h-20 w-full rounded-[10px] border bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0F4C81] focus:ring-2 focus:ring-[#E6F0FA]",
          error ? "border-red-300" : "border-slate-200",
          className,
        )}
        required={required}
        {...props}
      />
      {(error || helperText) && (
        <span className={cx("mt-1 block text-xs", error ? "text-red-600" : "text-slate-500")}>
          {error ?? helperText}
        </span>
      )}
    </label>
  );
}
