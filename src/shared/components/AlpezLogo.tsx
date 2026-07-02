import { cx } from "../lib/formatters";

export function AlpezLogo({ className }: { className?: string }) {
  return (
    <img
      alt="ALPEZ"
      className={cx("h-10 w-10 rounded-[10px] object-contain", className)}
      src="/alpez_logo.jpeg"
    />
  );
}
