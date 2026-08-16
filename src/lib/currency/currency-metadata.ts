import type { CurrencyInfo } from "@/lib/currency/currency-types";

/** Stable local ISO metadata — rates come from the provider, not from here. */
export const CURRENCY_METADATA: readonly CurrencyInfo[] = [
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "DKK", name: "Danish Krone", symbol: "kr" },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč" },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft" },
  { code: "RON", name: "Romanian Leu", symbol: "lei" },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "MXN", name: "Mexican Peso", symbol: "MX$" },
  { code: "ARS", name: "Argentine Peso", symbol: "AR$" },
  { code: "CLP", name: "Chilean Peso", symbol: "CLP" },
  { code: "COP", name: "Colombian Peso", symbol: "COP" },
  { code: "PEN", name: "Peruvian Sol", symbol: "S/" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
] as const;

const BY_CODE = new Map(CURRENCY_METADATA.map((item) => [item.code, item]));

export function getCurrencyInfo(code: string): CurrencyInfo {
  const normalized = code.trim().toUpperCase();
  return BY_CODE.get(normalized) ?? { code: normalized, name: normalized };
}

export function searchCurrencies(query: string): CurrencyInfo[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...CURRENCY_METADATA];
  return CURRENCY_METADATA.filter(
    (item) =>
      item.code.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      (item.symbol?.toLowerCase().includes(q) ?? false),
  );
}
