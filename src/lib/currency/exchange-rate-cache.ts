import type { ExchangeRateResult } from "@/lib/currency/currency-types";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

type CacheEntry = {
  result: ExchangeRateResult;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();

function cacheKey(from: string, to: string) {
  return `${from}_${to}`;
}

export function readRateCache(from: string, to: string): ExchangeRateResult | null {
  const entry = memoryCache.get(cacheKey(from, to));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    // Keep expired entry as stale fallback until a fresh fetch succeeds.
    return { ...entry.result, cached: true };
  }
  return { ...entry.result, cached: true };
}

export function readFreshRateCache(from: string, to: string): ExchangeRateResult | null {
  const entry = memoryCache.get(cacheKey(from, to));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  // Fresh within TTL — not a stale fallback for the UI.
  return { ...entry.result, cached: false };
}

export function writeRateCache(result: ExchangeRateResult) {
  memoryCache.set(cacheKey(result.from, result.to), {
    result: { ...result, cached: false },
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
