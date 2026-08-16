import { forwardRef, useState } from "react";
import { ArrowRight, ChevronDown, CircleDollarSign } from "lucide-react";

import { CurrencyConverterPanel } from "@/components/currency/currency-converter-popover";
import { useExchangeRate } from "@/components/app-shell/use-exchange-rate";
import { useCurrencyPreference } from "@/hooks/use-currency-preference";
import { useIsMobile } from "@/hooks/use-mobile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatCompactRate } from "@/lib/currency/format-rate";
import { cn } from "@/lib/utils";

type TriggerProps = {
  from: string;
  to: string;
  rateLabel: string;
  compact?: boolean | undefined;
  className?: string | undefined;
};

const HeaderTriggerButton = forwardRef<HTMLButtonElement, TriggerProps>(
  function HeaderTriggerButton({ from, to, rateLabel, compact, className, ...rest }, ref) {
    if (compact) {
      return (
        <button
          ref={ref}
          type="button"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-white px-2.5 text-[12px] font-semibold text-foreground",
            "hover:border-[#2563EB]/40 hover:bg-[#EFF6FF]/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
            className,
          )}
          aria-label={`Conversor de moedas ${from} para ${to}, taxa ${rateLabel}`}
          {...rest}
        >
          <CircleDollarSign className="size-3.5 text-[#2563EB]" strokeWidth={1.5} />
          <span>
            {from}/{to}
          </span>
        </button>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex h-10 items-center gap-3 rounded-[12px] border border-[#E6E8EC] bg-white pl-3 pr-2.5",
          "transition-colors duration-150",
          "hover:border-[#2563EB]/40 hover:bg-[#EFF6FF]/40",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
          className,
        )}
        aria-label={`Conversor de moedas ${from} para ${to}, taxa ${rateLabel}`}
        {...rest}
      >
        <span className="flex items-center gap-1.5 text-[12px] font-medium tracking-tight text-[#667085]">
          <span className="font-semibold text-[#0A0C10]">{from}</span>
          <ArrowRight className="size-3 opacity-60" strokeWidth={1.75} aria-hidden />
          <span className="font-semibold text-[#0A0C10]">{to}</span>
        </span>

        <span
          className={cn(
            "inline-flex min-w-[52px] items-center justify-center rounded-[8px] bg-[#EFF6FF] px-2 py-1",
            "text-[14px] font-semibold tabular-nums tracking-tight text-[#2563EB]",
          )}
        >
          {rateLabel}
        </span>

        <ChevronDown
          className="size-3.5 shrink-0 text-[#667085]"
          strokeWidth={1.5}
          aria-hidden
        />
      </button>
    );
  },
);

export type CurrencySwitcherProps = {
  className?: string;
};

/** Global AppShell currency converter control (preference + live/cached rate). */
export function CurrencySwitcher({ className }: CurrencySwitcherProps) {
  const isMobile = useIsMobile();
  const { from, to, setFrom, setTo, swap } = useCurrencyPreference();
  const fx = useExchangeRate(from, to);
  const [open, setOpen] = useState(false);

  const unavailable = !fx.loading && (fx.rate == null || Boolean(fx.error));
  const rateLabel = unavailable ? "—" : formatCompactRate(fx.rate);

  const panel = (
    <CurrencyConverterPanel
      from={from}
      to={to}
      rate={fx.rate}
      updatedAt={fx.updatedAt}
      loading={fx.loading}
      cached={fx.cached}
      unavailable={unavailable}
      onFromChange={(code) => {
        if (code === to) swap();
        else setFrom(code);
      }}
      onToChange={(code) => {
        if (code === from) swap();
        else setTo(code);
      }}
      onSwap={swap}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <HeaderTriggerButton
            from={from}
            to={to}
            rateLabel={rateLabel}
            compact
            className={className}
          />
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[90dvh] rounded-t-[16px] border-border p-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Currency converter</SheetTitle>
          </SheetHeader>
          {panel}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <HeaderTriggerButton
          from={from}
          to={to}
          rateLabel={rateLabel}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[400px] rounded-[16px] border border-[#E6E8EC] bg-white p-5 shadow-[0_8px_30px_rgba(10,12,16,0.08)]"
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

/** @deprecated Prefer CurrencySwitcher — kept for older imports. */
export { CurrencySwitcher as CurrencyConverterControl };
