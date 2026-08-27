import { cn } from "@/lib/utils";

/** FlagCDN PNG for language ISO region (Windows-safe — emoji flags often fail there). */
export function getLanguageFlagUrl(iso: string, width = 40): string | null {
  const region = iso.trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(region)) return null;
  return `https://flagcdn.com/w${width}/${region}.png`;
}

export function LanguageFlag({
  iso,
  className,
  size = "sm",
}: {
  iso: string;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const src = getLanguageFlagUrl(iso, size === "md" ? 80 : 40);
  const dim =
    size === "xs" ? "size-3.5" : size === "sm" ? "size-4" : "size-5";

  if (!src) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-[3px] bg-[#EFF6FF] text-[9px] font-bold text-[#2563EB]",
          dim,
          className,
        )}
        aria-hidden
      >
        {iso.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size === "md" ? 20 : size === "sm" ? 16 : 14}
      height={size === "md" ? 20 : size === "sm" ? 16 : 14}
      loading="lazy"
      decoding="async"
      className={cn(
        "shrink-0 rounded-[2px] object-cover ring-1 ring-[#E6E8EC]/80",
        dim,
        className,
      )}
      aria-hidden
    />
  );
}
