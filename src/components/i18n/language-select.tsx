import { LanguageFlag } from "@/components/i18n/language-flag";
import { LANGUAGE_LIST, type LanguageCode, type LanguageMeta } from "@/lib/i18n/languages";
import { cn } from "@/lib/utils";

export function LanguageSelect({
  value,
  onChange,
  languages = LANGUAGE_LIST,
  className,
}: {
  value: LanguageCode | null;
  onChange: (code: LanguageCode) => void;
  languages?: LanguageMeta[];
  className?: string;
}) {
  const selected = languages.find((item) => item.code === value) ?? null;

  return (
    <div className={cn("relative", className)}>
      {selected ? (
        <span className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2">
          <LanguageFlag iso={selected.iso} size="sm" />
        </span>
      ) : null}
      <select
        value={selected?.code ?? ""}
        onChange={(event) => {
          const next = languages.find((item) => item.code === event.target.value);
          if (next) onChange(next.code);
        }}
        className={cn(
          "h-10 w-full appearance-none rounded-[10px] border border-[#E6E8EC] bg-white text-[13px] text-[#0A0C10]",
          selected ? "pr-3 pl-9" : "px-3",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40",
        )}
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nativeName} ({item.iso})
          </option>
        ))}
      </select>
    </div>
  );
}
