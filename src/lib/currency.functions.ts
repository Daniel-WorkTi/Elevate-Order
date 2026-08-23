import { createServerFn } from "@tanstack/react-start";

import type { EurRateTable } from "@/lib/currency/exchange-rate-cache";
import { getEurRateTable, getExchangeRatePair } from "@/lib/currency/exchange-rate-provider";
import type { ExchangeRateResult } from "@/lib/currency/currency-types";

function parseCode(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

export const getExchangeRate = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    return {
      from: parseCode(raw["from"], "EUR"),
      to: parseCode(raw["to"], "BRL"),
    };
  })
  .handler(async ({ data }): Promise<{ rate: ExchangeRateResult | null; error: string | null }> => {
    try {
      const rate = await getExchangeRatePair(data.from, data.to);
      if (!rate) return { rate: null, error: "Rate unavailable" };
      return { rate, error: null };
    } catch (error) {
      console.error("getExchangeRate failed", error);
      return { rate: null, error: "Rate unavailable" };
    }
  });

/** Shared EUR pivot table for dashboard presentation conversion. */
export const getEurDisplayRates = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ table: EurRateTable | null; error: string | null }> => {
    try {
      const table = await getEurRateTable();
      if (!table) return { table: null, error: "Rate unavailable" };
      return { table, error: null };
    } catch (error) {
      console.error("getEurDisplayRates failed", error);
      return { table: null, error: "Rate unavailable" };
    }
  },
);
