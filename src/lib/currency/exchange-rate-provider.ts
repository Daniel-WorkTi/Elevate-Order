import {
  readFreshRateCache,
  readRateCache,
  writeRateCache,
} from "@/lib/currency/exchange-rate-cache";
import type { ExchangeRateResult } from "@/lib/currency/currency-types";

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

async function fetchFrankfurter(from: string, to: string): Promise<ExchangeRateResult> {
  const endpoints = [
    `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
    `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`,
  ];

  let lastError: unknown = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rates: Record<string, number>; date?: string };
      const rate = data.rates[to];
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
        throw new Error(`Missing rate ${from}->${to}`);
      }
      return {
        from,
        to,
        rate,
        fetchedAt: new Date().toISOString(),
        provider: "frankfurter",
        cached: false,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Exchange rate provider unavailable");
}

/**
 * Server-side exchange rate fetch with 1h memory cache.
 * Never invents rates. Same-currency returns 1 without network.
 */
export async function getExchangeRatePair(
  fromRaw: string,
  toRaw: string,
): Promise<ExchangeRateResult | null> {
  const from = normalizeCode(fromRaw);
  const to = normalizeCode(toRaw);

  if (from === to) {
    return {
      from,
      to,
      rate: 1,
      fetchedAt: new Date().toISOString(),
      provider: "identity",
      cached: false,
    };
  }

  const fresh = readFreshRateCache(from, to);
  if (fresh) return fresh;

  try {
    const live = await fetchFrankfurter(from, to);
    writeRateCache(live);
    return live;
  } catch (error) {
    console.error("getExchangeRatePair failed", error);
    const stale = readRateCache(from, to);
    if (stale) return stale;
    return null;
  }
}
