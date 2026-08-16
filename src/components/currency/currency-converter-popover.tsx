import { useId, useMemo, useState } from "react";
import { ArrowRight, ArrowUpDown } from "lucide-react";

import { CurrencyAmountInput } from "@/components/currency/currency-amount-input";
import { CurrencySelector } from "@/components/currency/currency-selector";
import { ExchangeRateStatus } from "@/components/currency/exchange-rate-status";
import { convertWithRate, formatMoney } from "@/lib/currency/convert-money";
import { cn } from "@/lib/utils";

const QUICK = ["EUR", "BRL", "USD", "GBP"] as const;

export type CurrencyConverterPanelProps = {
  from: string;
  to: string;
  rate: number | null;
  updatedAt: Date | string | null;
  loading?: boolean;
  cached?: boolean;
  unavailable?: boolean;
  onFromChange: (code: string) => void;
  onToChange: (code: string) => void;
  onSwap: () => void;
  className?: string;
};

export function CurrencyConverterPanel({
  from,
  to,
  rate,
  updatedAt,
  loading,
  cached,
  unavailable,
  onFromChange,
  onToChange,
  onSwap,
  className,
}: CurrencyConverterPanelProps) {
  const fromId = useId();
  const toId = useId();
  const amountId = useId();
  const [amount, setAmount] = useState(1);
  const [activeField, setActiveField] = useState<"from" | "to">("from");
  const [swapSpin, setSwapSpin] = useState(false);

  const converted = useMemo(() => {
    if (unavailable || loading) return null;
    return convertWithRate({ amount, from, to, rate });
  }, [amount, from, to, rate, unavailable, loading]);

  const convertedLabel =
    converted == null ? "—" : formatMoney(converted, to, "en-US");

  return (
    <div className={cn("space-y-5", className)}>
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-[#0A0C10]">
          Currency converter
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-[#667085]">
          Convert using the latest available exchange rate.
        </p>
      </div>

      <div className="relative space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={amountId} className="text-[12px] font-medium text-[#667085]">
            From
          </label>
          <div className="flex h-12 items-stretch overflow-hidden rounded-[12px] border border-[#E6E8EC] bg-white">
            <CurrencySelector
              id={fromId}
              value={from}
              embedded
              aria-label="From currency"
              onChange={(code) => {
                setActiveField("from");
                onFromChange(code);
              }}
            />
            <div className="my-2 w-px bg-[#E6E8EC]" aria-hidden />
            <CurrencyAmountInput
              id={amountId}
              value={amount}
              onChange={setAmount}
              aria-label="Amount to convert"
              className="h-full flex-1 rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="relative z-10 -my-1 flex justify-center">
          <button
            type="button"
            aria-label="Swap currencies"
            onClick={() => {
              setSwapSpin(true);
              onSwap();
              window.setTimeout(() => setSwapSpin(false), 220);
            }}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full border border-[#E6E8EC] bg-white text-[#0A0C10]",
              "shadow-sm transition-colors hover:border-[#2563EB]/40 hover:bg-[#EFF6FF]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
            )}
          >
            <ArrowUpDown
              className={cn(
                "size-4 transition-transform duration-200",
                swapSpin && "rotate-180",
              )}
              strokeWidth={1.75}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-[12px] font-medium text-[#667085]">To</span>
          <div className="flex h-12 items-stretch overflow-hidden rounded-[12px] border border-[#E6E8EC] bg-[#F7F8FA]">
            <CurrencySelector
              id={toId}
              value={to}
              embedded
              aria-label="To currency"
              className="bg-transparent"
              onChange={(code) => {
                setActiveField("to");
                onToChange(code);
              }}
            />
            <div className="my-2 w-px bg-[#E6E8EC]" aria-hidden />
            <div
              className="flex min-w-0 flex-1 items-center justify-end px-3 text-right text-[15px] font-semibold tabular-nums tracking-tight text-[#0A0C10]"
              aria-live="polite"
            >
              {loading ? (
                <span className="inline-block h-5 w-28 animate-pulse rounded bg-[#E6E8EC]/80" />
              ) : (
                convertedLabel
              )}
            </div>
          </div>
        </div>
      </div>

      <ExchangeRateStatus
        from={from}
        to={to}
        rate={rate}
        updatedAt={updatedAt}
        loading={loading}
        cached={cached}
        unavailable={unavailable}
      />

      <div className="space-y-2.5">
        <p className="text-[13px] font-semibold text-[#0A0C10]">Quick currencies</p>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((code) => {
            const selected =
              (activeField === "from" && from === code) ||
              (activeField === "to" && to === code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  if (activeField === "from") onFromChange(code);
                  else onToChange(code);
                }}
                className={cn(
                  "h-8 min-w-[52px] rounded-[8px] border px-3 text-[12px] font-semibold transition-colors",
                  selected
                    ? "border-[#2563EB] bg-[#2563EB] text-white"
                    : "border-[#E6E8EC] bg-white text-[#0A0C10] hover:border-[#2563EB]/35 hover:bg-[#EFF6FF]/60",
                )}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-center pt-1">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[#2563EB] hover:underline"
          onClick={() => {
            document.getElementById(activeField === "from" ? fromId : toId)?.click();
          }}
        >
          All currencies
          <ArrowRight className="size-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
