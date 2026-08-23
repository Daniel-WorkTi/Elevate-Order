import { convertMoney, formatMoney, normalizeCurrency } from "@/lib/money/format-money";

/** Convert a stored amount to the operator display currency. Never mutates the original. */
export function convertStoredAmount(
  amount: number | null | undefined,
  fromCurrency: string | null | undefined,
  displayCurrency: string,
  rateMap: Record<string, number>,
): number | null {
  if (amount == null || !Number.isFinite(amount)) return null;
  return convertMoney({
    amount,
    fromCurrency: normalizeCurrency(fromCurrency),
    toCurrency: displayCurrency,
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
  const converted = convertStoredAmount(amount, fromCurrency, displayCurrency, rateMap);
  if (converted == null) {
    return formatMoney(amount, normalizeCurrency(fromCurrency), locale);
  }
  return formatMoney(converted, displayCurrency, locale);
}

export function formatOrderDisplayTotal(
  order: Pick<OperationalOrder, "total" | "currency">,
  displayCurrency: string,
  rateMap: Record<string, number>,
  locale = "pt-PT",
): string | null {
  if (order.total === null || !Number.isFinite(order.total)) return null;
  const from = getOrderCurrency(order);
  const to = normalizeCurrency(displayCurrency);
  if (from === to) return null;
  const converted = convertStoredAmount(order.total, from, to, rateMap);
  if (converted == null) return null;
  return formatMoney(converted, to, locale);
}
