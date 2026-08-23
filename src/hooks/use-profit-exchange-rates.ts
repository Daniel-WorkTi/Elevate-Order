import { useEurRateTable } from "@/hooks/use-eur-rate-table";

/**
 * Profits uses the same EUR pivot table as the rest of the dashboard.
 * Conversion is presentation-only from stored original amounts.
 */
export function useProfitExchangeRates(_displayCurrency?: string) {
  const table = useEurRateTable();
  return {
    rateMap: table.rateMap,
    updatedAt: table.updatedAt,
    ready: !table.loading,
    error: table.error,
  };
}
