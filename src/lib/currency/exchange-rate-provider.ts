import {
  readEurTableCache,
  readFreshEurTableCache,
  readFreshRateCache,
  readRateCache,
  writeEurTableCache,
  writeRateCache,
  type EurRateTable,
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

function buildEurRateMap(rates: Record<string, number>): Record<string, number> {
  const rateMap: Record<string, number> = { EUR_EUR: 1 };
  for (const [code, rate] of Object.entries(rates)) {
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;
    const to = normalizeCode(code);
    if (!/^[A-Z]{3}$/.test(to) || to === "EUR") continue;
    rateMap[`EUR_${to}`] = rate;
    rateMap[`${to}_EUR`] = 1 / rate;
  }
  return rateMap;
}

async function fetchFrankfurterEurTable(): Promise<EurRateTable> {
  const endpoints = [
    "https://api.frankfurter.app/latest?from=EUR",
    "https://api.frankfurter.dev/v1/latest?base=EUR",
  ];

  let lastError: unknown = null;
  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { rates?: Record<string, number>; date?: string };
      const rateMap = buildEurRateMap(data.rates ?? {});
      if (!rateMap["EUR_USD"] && Object.keys(rateMap).length < 4) {
        throw new Error("Incomplete EUR rate table");
      }
      return {
        base: "EUR",
        rateMap,
        fetchedAt: new Date().toISOString(),
        provider: "frankfurter",
        cached: false,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("EUR rate table unavailable");
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

/**
 * Full EUR-based rate table for presentation conversion.
 * Always convert from the stored original amount through this map — never from a converted value.
 */
export async function getEurRateTable(): Promise<EurRateTable | null> {
  const fresh = readFreshEurTableCache();
  if (fresh) return fresh;

  try {
    const live = await fetchFrankfurterEurTable();
    writeEurTableCache(live);
    for (const [key, rate] of Object.entries(live.rateMap)) {
      const [from, to] = key.split("_");
      if (!from || !to || from === to) continue;
      writeRateCache({
        from,
        to,
        rate,
        fetchedAt: live.fetchedAt,
        provider: live.provider,
        cached: false,
      });
    }
    return live;
  } catch (error) {
    console.error("getEurRateTable failed", error);
    return readEurTableCache();
  }
}
