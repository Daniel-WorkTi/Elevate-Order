import { convertMoney, formatMoney, readIsoCurrency } from "@/lib/money/format-money";
import type { OperationalOrder } from "@/lib/order-domain";

/** Convert a stored amount to the operator display currency. Never mutates the original. */
export function convertStoredAmount(
  amount: number | null | undefined,
  fromCurrency: string | null | undefined,
  displayCurrency: string,
  rateMap: Record<string, number>,
): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  const from = readIsoCurrency(fromCurrency);
  const to = readIsoCurrency(displayCurrency);
  if (!to || !from) return null;
  return convertMoney({
    amount,
    fromCurrency: from,
    toCurrency: to,
    rateMap,
  });
}

export function formatStoredAmount(
  amount: number | null | undefined,
  fromCurrency: string | null | undefined,
  displayCurrency: string,
  rateMap: Record<string, number>,
  locale = "pt-PT",
): string {
  const to = readIsoCurrency(displayCurrency);
  if (!to) return "—";
  const from = readIsoCurrency(fromCurrency);
  if (!from) return "—";
  const converted = convertStoredAmount(amount, from, to, rateMap);
  if (converted == null) return "—";
  return formatMoney(converted, to, locale);
}

export function formatOrderDisplayTotal(
  order: Pick<OperationalOrder, "total" | "currency">,
  displayCurrency: string | null | undefined,
  rateMap: Record<string, number>,
  locale = "pt-PT",
): string | null {
  if (!displayCurrency) return null;
  if (order.total === null || !Number.isFinite(order.total)) return null;
  const from = readIsoCurrency(order.currency);
  const to = readIsoCurrency(displayCurrency);
  if (!from || !to || from === to) return null;
  const converted = convertStoredAmount(order.total, from, to, rateMap);
  if (converted == null) return null;
  return formatMoney(converted, to, locale);
}
