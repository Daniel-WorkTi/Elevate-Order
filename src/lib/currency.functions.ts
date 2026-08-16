import { createServerFn } from "@tanstack/react-start";

import { getExchangeRatePair } from "@/lib/currency/exchange-rate-provider";
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
