export type CurrencyCode = string;

export type CurrencyInfo = {
  code: string;
  name: string;
  symbol?: string;
};

export type ExchangeRateResult = {
  from: string;
  to: string;
  rate: number;
  fetchedAt: string;
  provider: string;
  cached: boolean;
};

export type CurrencyPreference = {
  from: string;
  /** Primary / foreground currency — drives all dashboard money figures. */
  to: string;
};

export const CURRENCY_PREFERENCE_KEY = "elevate-currency-preference";

export const QUICK_CURRENCIES = ["EUR", "BRL", "USD", "GBP", "PLN"] as const;
