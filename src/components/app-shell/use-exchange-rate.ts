import { useEffect, useState } from "react";

type ExchangeRateState = {
  rate: number | null;
  updatedAt: Date | null;
};

/** Fetches a public FX rate for the shell control. Never invents a fallback rate. */
export function useExchangeRate(from = "EUR", to = "BRL") {
  const [state, setState] = useState<ExchangeRateState>({ rate: null, updatedAt: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (from === to) {
          if (!cancelled) setState({ rate: 1, updatedAt: new Date() });
          return;
        }
        const res = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
        if (!res.ok) throw new Error("fx failed");
        const data = (await res.json()) as { rates: Record<string, number>; date: string };
        if (cancelled) return;
        const rate = data.rates[to];
        setState({
          rate: typeof rate === "number" ? rate : null,
          updatedAt: data.date ? new Date(`${data.date}T16:00:00Z`) : new Date(),
        });
      } catch {
        if (!cancelled) setState({ rate: null, updatedAt: null });
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return state;
}
