import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cx } from "../lib/formatters";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[#0F4C81] text-white hover:bg-[#0B3A63] border-transparent",
  secondary: "bg-[#E6F0FA] text-[#0F4C81] hover:bg-[#d4e5f5] border-transparent",
  outline: "bg-white text-slate-700 hover:bg-slate-50 border-slate-200",
  ghost: "bg-transparent text-slate-700 hover:bg-slate-100 border-transparent",
  danger: "bg-red-600 text-white hover:bg-red-700 border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
