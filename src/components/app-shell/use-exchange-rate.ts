import { useEffect, useState } from "react";

import { getExchangeRate } from "@/lib/currency.functions";
import type { ExchangeRateResult } from "@/lib/currency/currency-types";

export type UseExchangeRateState = {
  rate: number | null;
  updatedAt: Date | null;
  loading: boolean;
  cached: boolean;
  provider: string | null;
  error: string | null;
  result: ExchangeRateResult | null;
};

const INITIAL: UseExchangeRateState = {
  rate: null,
  updatedAt: null,
  loading: true,
  cached: false,
  provider: null,
  error: null,
  result: null,
};

/** Client hook over the server-cached exchange-rate function. Never invents rates. */
export function useExchangeRate(from = "EUR", to = "BRL"): UseExchangeRateState {
  const [state, setState] = useState<UseExchangeRateState>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const { rate, error } = await getExchangeRate({ data: { from, to } });
        if (cancelled) return;
        if (!rate) {
          setState({
            rate: null,
            updatedAt: null,
            loading: false,
            cached: false,
            provider: null,
            error: error ?? "Rate unavailable",
            result: null,
          });
          return;
        }
        setState({
          rate: rate.rate,
          updatedAt: new Date(rate.fetchedAt),
          loading: false,
          cached: rate.cached,
          provider: rate.provider,
          error: null,
          result: rate,
        });
      } catch (err) {
        if (cancelled) return;
        console.error("useExchangeRate failed", err);
        setState({
          rate: null,
          updatedAt: null,
          loading: false,
          cached: false,
          provider: null,
          error: "Rate unavailable",
          result: null,
        });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return state;
}
