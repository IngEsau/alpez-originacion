import { cx } from "../lib/formatters";

type AlpezLogoVariant = "mark" | "horizontal";

export function AlpezLogo({ className, variant = "mark" }: { className?: string; variant?: AlpezLogoVariant }) {
  const isHorizontal = variant === "horizontal";

  return (
    <img
      alt="ALPEZ"
      className={cx(isHorizontal ? "h-12 w-auto object-contain" : "h-10 w-10 rounded-[10px] object-contain", className)}
      src={isHorizontal ? "/logo_alpez_horizontal.png" : "/alpez_logo.png"}
    />
  );
}
