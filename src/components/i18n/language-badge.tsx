import { LanguageFlag } from "@/components/i18n/language-flag";
import { formatLanguageBadge, type LanguageMeta } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";

export function LanguageBadge({
  language,
  className,
}: {
  language: LanguageMeta | null;
  className?: string;
}) {
  if (!language) return null;
  const { label } = formatLanguageBadge(language);
  return (
    <span
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E6E8EC] bg-[#F7F8FA] px-1.5 py-0.5",
        "text-[11px] font-medium tabular-nums text-[#0A0C10]",
        className,
      )}
    >
      <LanguageFlag iso={language.iso} size="xs" />
      <span>{language.iso}</span>
    </span>
  );
}
