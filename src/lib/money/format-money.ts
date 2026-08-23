export type Money = {
  amount: number;
  currency: string;
};

const ISO = /^[A-Z]{3}$/;

export function readIsoCurrency(code: string | null | undefined): string | null {
  const value = code?.trim().toUpperCase();
  return value && ISO.test(value) ? value : null;
}

export function normalizeCurrency(code: string | null | undefined, fallback = "EUR"): string {
  return readIsoCurrency(code) ?? fallback;
}

export function formatMoney(
  amount: number | null | undefined,
  currency: string,
  locale = "pt-PT",
): string {
  if (amount == null || !Number.isFinite(amount)) return "—";
  const code = normalizeCurrency(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

/**
 * Convert using an explicit rate map.
 * Keys: "FROM_TO" (e.g. EUR_BRL). Never invents missing rates.
 */
export function convertMoney(input: {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  rateMap: Record<string, number>;
}): number | null {
  const from = normalizeCurrency(input.fromCurrency);
  const to = normalizeCurrency(input.toCurrency);
  if (!Number.isFinite(input.amount)) return null;
  if (from === to) return input.amount;

  const direct = input.rateMap[`${from}_${to}`];
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) {
    return input.amount * direct;
  }

  const inverse = input.rateMap[`${to}_${from}`];
  if (typeof inverse === "number" && Number.isFinite(inverse) && inverse > 0) {
    return input.amount / inverse;
  }

  // EUR pivot when available
  const fromEur = input.rateMap[`EUR_${from}`];
  const toEur = input.rateMap[`EUR_${to}`];
  if (
    typeof fromEur === "number" &&
    typeof toEur === "number" &&
    fromEur > 0 &&
    toEur > 0
  ) {
    const inEur = from === "EUR" ? input.amount : input.amount / fromEur;
    return to === "EUR" ? inEur : inEur * toEur;
  }

  return null;
}

export function sumConverted(
  items: Array<{ amount: number; currency: string }>,
  toCurrency: string,
  rateMap: Record<string, number>,
): { total: number | null; skipped: number; converted: number } {
  let total = 0;
  let skipped = 0;
  let converted = 0;

  for (const item of items) {
    const value = convertMoney({
      amount: item.amount,
      fromCurrency: item.currency,
      toCurrency,
      rateMap,
    });
    if (value == null) {
      skipped += 1;
      continue;
    }
    total += value;
    converted += 1;
  }

  if (converted === 0) return { total: null, skipped, converted };
  return { total, skipped, converted };
}
