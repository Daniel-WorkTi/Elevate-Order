import { getCurrencyFlagUrl } from "@/lib/currency/currency-flags";
import { cn } from "@/lib/utils";

type CurrencyFlagProps = {
  code: string;
  className?: string;
  size?: "sm" | "md";
};

export function CurrencyFlag({ code, className, size = "md" }: CurrencyFlagProps) {
  const src = getCurrencyFlagUrl(code, 80);
  const dim = size === "sm" ? "size-5" : "size-6";

  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-[9px] font-bold text-[#2563EB]",
          dim,
          className,
        )}
        aria-hidden
      >
        {code.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size === "sm" ? 20 : 24}
      height={size === "sm" ? 20 : 24}
      loading="lazy"
      decoding="async"
      className={cn(
        "shrink-0 rounded-full object-cover ring-1 ring-[#E6E8EC]",
        dim,
        className,
      )}
      aria-hidden
    />
  );
}
