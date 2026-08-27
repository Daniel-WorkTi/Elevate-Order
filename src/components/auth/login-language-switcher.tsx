import { LanguageFlag } from "@/components/i18n/language-flag";
import { localeToLanguage } from "@/lib/i18n/languages";
import { useI18n } from "@/lib/i18n/locale-context";
import { LOCALES } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

export function LoginLanguageSwitcher({
  className,
  tone = "dark",
}: {
  className?: string;
  tone?: "dark" | "light";
}) {
  const { locale, setLocale, t } = useI18n();
  const light = tone === "light";

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-[10px] p-1",
        light
          ? "border border-[#E6E8EC] bg-white shadow-sm"
          : "border border-white/10 bg-white/5",
        className,
      )}
      role="group"
      aria-label={t("shell.languageAria")}
    >
      {LOCALES.map((code) => {
        const meta = localeToLanguage(code);
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            title={meta.nativeName}
            aria-pressed={active}
            onClick={() => setLocale(code)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[11px] font-semibold tracking-wide transition-colors",
              active
                ? "bg-[#2563EB] text-white"
                : light
                  ? "text-[#667085] hover:bg-[#F7F8FA] hover:text-[#0A0C10]"
                  : "text-[#98A2B3] hover:bg-white/10 hover:text-white",
            )}
          >
            <LanguageFlag iso={meta.iso} size="xs" />
            <span>{meta.iso}</span>
          </button>
        );
      })}
    </div>
  );
}
