import { LanguageFlag } from "@/components/i18n/language-flag";
import { localeToLanguage } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-context";
import { LOCALES, type Locale } from "@/lib/i18n/types";

function nextLocale(current: Locale): Locale {
  const index = LOCALES.indexOf(current);
  return LOCALES[(index + 1) % LOCALES.length]!;
}

export function LanguageSwitcher({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();
  const activeMeta = localeToLanguage(locale);

  if (collapsed) {
    const upcoming = localeToLanguage(nextLocale(locale));
    return (
      <button
        type="button"
        title={`${activeMeta.nativeName} → ${upcoming.nativeName}`}
        aria-label={t("shell.languageCycleAria", {
          current: activeMeta.nativeName,
          next: upcoming.nativeName,
        })}
        onClick={(event) => {
          event.stopPropagation();
          setLocale(nextLocale(locale));
        }}
        className={cn(
          "mx-auto flex size-9 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03]",
          "transition-colors hover:bg-white/[0.08]",
          className,
        )}
      >
        <LanguageFlag iso={activeMeta.iso} size="sm" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1",
        className,
      )}
      role="group"
      aria-label={t("shell.languageAria")}
    >
      <span className="px-2 text-[11px] font-medium text-[color:var(--sidebar-muted)]">
        {t("shell.language")}
      </span>
      {LOCALES.map((code: Locale) => {
        const meta = localeToLanguage(code);
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setLocale(code);
            }}
            title={meta.nativeName}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[8px] px-2 py-1.5 text-[11px] font-semibold tracking-wide transition-colors",
              active
                ? "bg-[color:var(--elevate-blue)] text-white"
                : "text-[color:var(--sidebar-muted)] hover:bg-white/[0.06] hover:text-white",
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
