import { formatLanguageBadge, type LanguageMeta } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";

export function LanguageBadge({
  language,
  className,
}: {
  language: LanguageMeta | null;
  className?: string;
}) {
  const { compact, label } = formatLanguageBadge(language);
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-[#E6E8EC] bg-[#F7F8FA] px-1.5 py-0.5",
        "text-[11px] font-medium tabular-nums text-[#0A0C10]",
        className,
      )}
    >
      {compact}
    </span>
  );
}
