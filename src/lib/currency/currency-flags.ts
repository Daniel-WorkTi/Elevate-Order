/**
 * Representative region for flag display.
 * Currencies ≠ countries, but operators expect a familiar visual cue.
 */
const CURRENCY_FLAG_REGION: Record<string, string> = {
  EUR: "eu",
  BRL: "br",
  USD: "us",
  GBP: "gb",
  PLN: "pl",
  CHF: "ch",
  SEK: "se",
  NOK: "no",
  DKK: "dk",
  CZK: "cz",
  HUF: "hu",
  RON: "ro",
  BGN: "bg",
  TRY: "tr",
  CAD: "ca",
  AUD: "au",
  NZD: "nz",
  JPY: "jp",
  CNY: "cn",
  HKD: "hk",
  SGD: "sg",
  INR: "in",
  MXN: "mx",
  ARS: "ar",
  CLP: "cl",
  COP: "co",
  PEN: "pe",
  ZAR: "za",
  ILS: "il",
  AED: "ae",
  SAR: "sa",
  KRW: "kr",
  THB: "th",
  IDR: "id",
  PHP: "ph",
  MYR: "my",
};

export function getCurrencyFlagRegion(code: string): string | null {
  const region = CURRENCY_FLAG_REGION[code.trim().toUpperCase()];
  return region ?? null;
}

/** Real flag PNG via FlagCDN (w80 for crisp circular crops). */
export function getCurrencyFlagUrl(code: string, width = 80): string | null {
  const region = getCurrencyFlagRegion(code);
  if (!region) return null;
  return `https://flagcdn.com/w${width}/${region}.png`;
}
