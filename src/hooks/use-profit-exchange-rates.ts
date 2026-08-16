import { useEffect, useState } from "react";

import { PROFIT_CURRENCIES, type ProfitCurrency } from "@/lib/profits/profits-search";

type RatesState = {
  rateMap: Record<string, number>;
  updatedAt: Date | null;
  ready: boolean;
  error: string | null;
};

function identityMap(displayCurrency: ProfitCurrency): Record<string, number> {
  return {
    EUR_EUR: 1,
    [`${displayCurrency}_${displayCurrency}`]: 1,
  };
}

/**
 * Loads Frankfurter rates with EUR as pivot. Never hardcodes FX.
 * When display currency is EUR, no network call is required.
 */
export function useProfitExchangeRates(displayCurrency: ProfitCurrency) {
  const [state, setState] = useState<RatesState>(() => ({
    rateMap: identityMap(displayCurrency),
    updatedAt: displayCurrency === "EUR" ? new Date() : null,
    ready: displayCurrency === "EUR",
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;

    // Canonical totals are EUR when supply omits currency — no conversion needed.
    if (displayCurrency === "EUR") {
      setState({
        rateMap: identityMap("EUR"),
        updatedAt: new Date(),
        ready: true,
        error: null,
      });
      return;
    }

    async function load() {
      const targets = PROFIT_CURRENCIES.filter((code) => code !== "EUR").join(",");
      const endpoints = [
        `https://api.frankfurter.app/latest?from=EUR&to=${targets}`,
        `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${targets}`,
      ];

      let lastError: unknown = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`fx ${res.status}`);
          const data = (await res.json()) as { rates: Record<string, number>; date?: string };
          if (cancelled) return;

          const rateMap = identityMap(displayCurrency);
          for (const [code, rate] of Object.entries(data.rates ?? {})) {
            if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
              rateMap[`EUR_${code}`] = rate;
              rateMap[`${code}_EUR`] = 1 / rate;
            }
          }

          if (!rateMap[`EUR_${displayCurrency}`]) {
            throw new Error(`missing rate for ${displayCurrency}`);
          }

          setState({
            rateMap,
            updatedAt: data.date ? new Date(`${data.date}T16:00:00Z`) : new Date(),
            ready: true,
            error: null,
          });
          return;
        } catch (error) {
          lastError = error;
        }
      }

      if (!cancelled) {
        console.warn("useProfitExchangeRates failed", lastError);
        setState({
          rateMap: identityMap(displayCurrency),
          updatedAt: null,
          ready: true,
          error: "Exchange rate unavailable — showing EUR source amounts when conversion fails.",
        });
      }
    }

    setState((prev) => ({ ...prev, ready: false, error: null }));
    void load();
    return () => {
      cancelled = true;
    };
  }, [displayCurrency]);

  return state;
}
