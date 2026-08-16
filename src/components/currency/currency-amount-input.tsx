import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Accepts both `10.50` and `10,50` as ten point five.
 * Never treats a decimal separator as thousands grouping.
 */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // Last separator is the decimal; the other is thousands.
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    // Portuguese decimal: 10,50
    normalized = cleaned.replace(",", ".");
  } else {
    // Dot decimal (or integer): 10.50
    normalized = cleaned;
  }

  if (normalized === "." || normalized === "") return null;

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0 || value > 1e12) return null;
  return value;
}

/** Display without thousands separators so 10.50 never becomes 1,050. */
function formatEditing(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0.00";
  return value.toFixed(2);
}

export type CurrencyAmountInputProps = {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function CurrencyAmountInput({
  id,
  value,
  onChange,
  disabled,
  readOnly,
  className,
  "aria-label": ariaLabel,
}: CurrencyAmountInputProps) {
  const [text, setText] = useState(() => formatEditing(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatEditing(value));
  }, [value, focused]);

  return (
    <Input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      spellCheck={false}
      disabled={disabled}
      readOnly={readOnly}
      aria-label={ariaLabel}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        const next = event.target.value;
        if (!/^[0-9.,\s]*$/.test(next)) return;
        // Allow at most one decimal separator (`.` or `,`)
        const separators = next.replace(/[^.,]/g, "");
        if (separators.length > 1) return;
        setText(next);
        const parsed = parseAmount(next);
        if (parsed != null) onChange(parsed);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseAmount(text);
        if (parsed == null) {
          onChange(0);
          setText(formatEditing(0));
          return;
        }
        onChange(parsed);
        setText(formatEditing(parsed));
      }}
      className={cn(
        "h-10 rounded-[10px] border border-[#E6E8EC] bg-white text-right text-[15px] font-semibold tabular-nums text-[#0A0C10] shadow-none",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/35",
        readOnly && "bg-[#F7F8FA] text-[#2563EB]",
        className,
      )}
    />
  );
}
