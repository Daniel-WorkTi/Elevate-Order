import { calculateMargin } from "@/lib/money/calculate-profit";
import { formatMoney, sumConverted } from "@/lib/money/format-money";
import type { OrderFinancials } from "@/lib/profits/normalize-order-financials";
import {
  chartBucketKey,
  chartBucketLabel,
  type ProfitPeriod,
  type ProfitCurrency,
} from "@/lib/profits/profits-search";
import type { Supply } from "@/lib/order-domain";

export type FinancialSummary = {
  orderCount: number;
  revenue: number | null;
  knownCosts: number | null;
  fees: number | null;
  profit: number | null;
  margin: number | null;
  skippedRevenue: number;
  currency: string;
  costsAvailable: boolean;
  feesAvailable: boolean;
  profitAvailable: boolean;
};

export function aggregateFinancials(
  orders: OrderFinancials[],
  displayCurrency: ProfitCurrency,
  rateMap: Record<string, number>,
  options?: { costsAvailable?: boolean; feesAvailable?: boolean },
): FinancialSummary {
  const costsAvailable = options?.costsAvailable ?? false;
  const feesAvailable = options?.feesAvailable ?? false;

  const revenueItems = orders
    .filter((o) => o.revenue)
    .map((o) => ({ amount: o.revenue!.amount, currency: o.revenue!.currency }));

  const revenueAgg = sumConverted(revenueItems, displayCurrency, rateMap);

  let knownCosts: number | null = null;
  let fees: number | null = null;
  let profit: number | null = null;

  if (costsAvailable) {
    const costItems = orders
      .filter((o) => o.knownCosts)
      .map((o) => ({ amount: o.knownCosts!.amount, currency: o.knownCosts!.currency }));
    knownCosts = sumConverted(costItems, displayCurrency, rateMap).total;
  }

  if (feesAvailable) {
    const feeItems = orders
      .filter((o) => o.fees)
      .map((o) => ({ amount: o.fees!.amount, currency: o.fees!.currency }));
    fees = sumConverted(feeItems, displayCurrency, rateMap).total;
  }

  const profitAvailable = costsAvailable && knownCosts != null && revenueAgg.total != null;
  if (profitAvailable) {
    profit = (revenueAgg.total ?? 0) - (knownCosts ?? 0) - (fees ?? 0);
  }

  return {
    orderCount: orders.length,
    revenue: revenueAgg.total,
    knownCosts: costsAvailable ? knownCosts : null,
    fees: feesAvailable ? fees : null,
    profit: profitAvailable ? profit : null,
    margin: calculateMargin(profitAvailable ? profit : null, revenueAgg.total),
    skippedRevenue: revenueAgg.skipped,
    currency: displayCurrency,
    costsAvailable,
    feesAvailable,
    profitAvailable,
  };
}

export type ChartPoint = {
  key: string;
  label: string;
  revenue: number | null;
};

export function buildRevenueChart(
  orders: OrderFinancials[],
  period: ProfitPeriod,
  displayCurrency: ProfitCurrency,
  rateMap: Record<string, number>,
): ChartPoint[] {
  const buckets = new Map<string, Array<{ amount: number; currency: string }>>();

  for (const order of orders) {
    if (!order.revenue || !order.date) continue;
    const key = chartBucketKey(order.date, period);
    const list = buckets.get(key) ?? [];
    list.push({ amount: order.revenue.amount, currency: order.revenue.currency });
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: chartBucketLabel(key, period),
      revenue: sumConverted(items, displayCurrency, rateMap).total,
    }));
}

export type SupplyBreakdownRow = FinancialSummary & {
  supply: Supply;
};

export function buildSupplyBreakdown(
  orders: OrderFinancials[],
  displayCurrency: ProfitCurrency,
  rateMap: Record<string, number>,
  options?: { costsAvailable?: boolean; feesAvailable?: boolean },
): SupplyBreakdownRow[] {
  const supplies: Supply[] = ["dropi", "dropea"];
  return supplies.map((supply) => ({
    supply,
    ...aggregateFinancials(
      orders.filter((o) => o.supply === supply),
      displayCurrency,
      rateMap,
      options,
    ),
  }));
}

export function formatSummaryMoney(amount: number | null, currency: string): string {
  return formatMoney(amount, currency);
}
