import type { SelectHTMLAttributes } from "react";
import { cx } from "../lib/formatters";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export function Select({ label, error, helperText, options, className, id, required, ...props }: SelectProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block" htmlFor={inputId}>
      {label && (
        <span className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </span>
      )}
      <select
        id={inputId}
        className={cx(
          "h-10 w-full rounded-[10px] border bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-[#0F4C81] focus:ring-2 focus:ring-[#E6F0FA]",
          error ? "border-red-300" : "border-slate-200",
          className,
        )}
        required={required}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(error || helperText) && (
        <span className={cx("mt-1 block text-xs", error ? "text-red-600" : "text-slate-500")}>
          {error ?? helperText}
        </span>
      )}
    </label>
  );
}
