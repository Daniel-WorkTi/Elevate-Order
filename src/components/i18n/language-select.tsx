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
    <select
      value={selected?.code ?? ""}
      onChange={(event) => {
        const next = languages.find((item) => item.code === event.target.value);
        if (next) onChange(next.code);
      }}
      className={cn(
        "h-10 rounded-[10px] border border-[#E6E8EC] bg-white px-3 text-[13px] text-[#0A0C10]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40",
        className,
      )}
    >
      {languages.map((item) => (
        <option key={item.code} value={item.code}>
          {item.flag} {item.nativeName}
        </option>
      ))}
    </select>
  );
}
