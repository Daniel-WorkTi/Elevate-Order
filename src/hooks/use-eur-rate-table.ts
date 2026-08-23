import { useQuery } from "@tanstack/react-query";

import { getEurDisplayRates } from "@/lib/currency.functions";

const IDENTITY_MAP = { EUR_EUR: 1 };

export type EurRateTableState = {
  rateMap: Record<string, number>;
  updatedAt: Date | null;
  loading: boolean;
  cached: boolean;
  error: string | null;
};

/**
 * Single client hook over the server-cached EUR rate table.
 * Components must convert from stored original amounts — never from already converted values.
 */
export function useEurRateTable(): EurRateTableState {
  const query = useQuery({
    queryKey: ["currency", "eur-rate-table"],
    queryFn: () => getEurDisplayRates(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const table = query.data?.table ?? null;
  const error = query.data?.error ?? (query.isError ? "Rate unavailable" : null);

  return {
    rateMap: table?.rateMap ?? IDENTITY_MAP,
    updatedAt: table ? new Date(table.fetchedAt) : null,
    loading: query.isPending && !table,
    cached: table?.cached ?? false,
    error: table ? null : error,
  };
}
