import { normalizeCurrency } from "@/lib/money/format-money";

/** Presentation conversion with an explicit rate. Never invents a missing rate. */
export function convertWithRate(input: {
  amount: number;
  from: string;
  to: string;
  rate: number | null | undefined;
}): number | null {
  const from = normalizeCurrency(input.from);
  const to = normalizeCurrency(input.to);
  if (!Number.isFinite(input.amount) || input.amount < 0) return null;
  if (from === to) return input.amount;
  if (typeof input.rate !== "number" || !Number.isFinite(input.rate) || input.rate <= 0) {
    return null;
  }
  return input.amount * input.rate;
}

export {
  convertMoney,
  formatMoney,
  normalizeCurrency,
  sumConverted,
  type Money,
} from "@/lib/money/format-money";
