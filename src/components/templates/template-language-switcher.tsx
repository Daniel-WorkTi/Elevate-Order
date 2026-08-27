import { LanguageFlag } from "@/components/i18n/language-flag";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_LIST, type LanguageCode } from "@/lib/i18n/languages";
import { useT } from "@/lib/i18n/locale-context";
import { TEMPLATE_LANGUAGES } from "@/lib/templates/default-templates";
import { cn } from "@/lib/utils";

const OPTIONS = LANGUAGE_LIST.filter((item) =>
  (TEMPLATE_LANGUAGES as readonly string[]).includes(item.code),
);

/** Compact dropdown: current flag + language; opens to pick another. */
export function TemplateLanguageSwitcher({
  value,
  onChange,
  className,
}: {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
  className?: string;
}) {
  const t = useT();
  const selected = OPTIONS.find((item) => item.code === value) ?? OPTIONS[0]!;

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as LanguageCode)}
    >
      <SelectTrigger
        aria-label={t("templates.languageAria")}
        className={cn(
          "h-8 w-auto min-w-[7.5rem] gap-1.5 rounded-[10px] border-[#E6E8EC] bg-white px-2.5 text-[12px] font-medium shadow-none",
          "focus:ring-[#2563EB]/30",
          className,
        )}
      >
        <SelectValue>
          <span className="inline-flex items-center gap-1.5">
            <LanguageFlag iso={selected.iso} size="xs" />
            <span className="text-[#0A0C10]">{selected.nativeName}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="end"
        className="min-w-[11rem] rounded-[12px] border-[#E6E8EC] p-1 shadow-[0_8px_24px_rgba(10,12,16,0.08)]"
      >
        {OPTIONS.map((meta) => (
          <SelectItem
            key={meta.code}
            value={meta.code}
            className="cursor-pointer rounded-[8px] py-2 pl-2 pr-8 text-[13px]"
          >
            <span className="inline-flex items-center gap-2">
              <LanguageFlag iso={meta.iso} size="sm" />
              <span>{meta.nativeName}</span>
              <span className="text-[11px] font-medium text-[#667085]">{meta.iso}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
