import { localeToLanguage } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-context";
import { LOCALES, type Locale } from "@/lib/i18n/types";

export function LanguageSwitcher({
  collapsed = false,
  className,
}: {
  collapsed?: boolean;
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={cn(
        "rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1",
        collapsed ? "flex flex-col gap-1" : "flex items-center gap-1",
        className,
      )}
      role="group"
      aria-label={t("shell.languageAria")}
    >
      {!collapsed ? (
        <span className="px-2 text-[11px] font-medium text-[color:var(--sidebar-muted)]">
          {t("shell.language")}
        </span>
      ) : null}
      {LOCALES.map((code) => {
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
              "rounded-[8px] text-[11px] font-semibold tracking-wide transition-colors",
              collapsed ? "px-2 py-1.5" : "px-2 py-1.5",
              active
                ? "bg-[color:var(--elevate-blue)] text-white"
                : "text-[color:var(--sidebar-muted)] hover:bg-white/[0.06] hover:text-white",
            )}
          >
            {collapsed ? meta.flag : `${meta.flag} ${meta.iso}`}
          </button>
        );
      })}
    </div>
  );
}
