import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { CurrencyFlag } from "@/components/currency/currency-flag";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCurrencyInfo, searchCurrencies } from "@/lib/currency/currency-metadata";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

export type CurrencySelectorProps = {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  className?: string;
  /** Ghost trigger for use inside a unified money field. */
  embedded?: boolean | undefined;
  "aria-label"?: string;
};

export function CurrencySelector({
  value,
  onChange,
  id,
  className,
  embedded = false,
  "aria-label": ariaLabel,
}: CurrencySelectorProps) {
  const t = useT();
  const resolvedAria = ariaLabel ?? t("currency.selectAria");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const info = getCurrencyInfo(value);
  const results = useMemo(() => searchCurrencies(query), [query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          aria-label={resolvedAria}
          className={cn(
            "h-11 shrink-0 gap-1.5 px-2.5 text-[13px] font-semibold text-[#0A0C10] shadow-none",
            "hover:bg-transparent hover:text-[#0A0C10]",
            "focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/35",
            !embedded &&
              "rounded-[10px] border border-[#E6E8EC] bg-white hover:border-[#2563EB]/40 hover:bg-[#EFF6FF]/50",
            embedded && "rounded-none border-0 bg-transparent",
            className,
          )}
        >
          <CurrencyFlag code={info.code} />
          <span>{info.code}</span>
          <ChevronDown className="size-3.5 text-[#667085]" strokeWidth={1.75} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] rounded-[12px] border-border p-0 shadow-md"
        sideOffset={6}
      >
        <Command shouldFilter={false} className="rounded-[12px]">
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("currency.searchPlaceholder")}
          />
          <CommandList className="max-h-56">
            <CommandEmpty className="py-6 text-center text-[13px] text-muted-foreground">
              {t("currency.notFound")}
            </CommandEmpty>
            <CommandGroup>
              {results.map((item) => (
                <CommandItem
                  key={item.code}
                  value={item.code}
                  onSelect={() => {
                    onChange(item.code);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="cursor-pointer gap-2 rounded-[8px] px-2 py-2"
                >
                  <CurrencyFlag code={item.code} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-foreground">{item.code}</span>
                      {item.symbol ? (
                        <span className="text-[12px] text-muted-foreground">{item.symbol}</span>
                      ) : null}
                    </div>
                    <p className="truncate text-[12px] text-muted-foreground">{item.name}</p>
                  </div>
                  <Check
                    className={cn(
                      "size-3.5 shrink-0 text-[#2563EB]",
                      value === item.code ? "opacity-100" : "opacity-0",
                    )}
                    strokeWidth={1.5}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
