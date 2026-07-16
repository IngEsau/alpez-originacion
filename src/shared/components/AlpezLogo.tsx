import { cx } from "../lib/formatters";

type AlpezLogoVariant = "mark" | "horizontal";

export function AlpezLogo({ className, variant = "mark" }: { className?: string; variant?: AlpezLogoVariant }) {
  const isHorizontal = variant === "horizontal";
  const defaultClasses = isHorizontal
    ? "h-12 w-auto object-contain"
    : "h-10 w-10 rounded-[10px] object-contain";
  const customClasses = isHorizontal
    ? "w-auto object-contain"
    : "rounded-[10px] object-contain";

  return (
    <img
      alt="ALPEZ"
      className={cx(className ? customClasses : defaultClasses, className)}
      src={isHorizontal ? "/logo_alpez_horizontal.png" : "/alpez_logo.png"}
    />
  );
}
