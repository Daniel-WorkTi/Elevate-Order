import type { Money } from "@/lib/money/format-money";

/**
 * Profit only when known costs (and optionally fees) are present.
 * Never invents COGS / fee percentages.
 */
export function calculateProfit(input: {
  revenue: Money | null;
  knownCosts: Money | null;
  fees: Money | null;
}): Money | null {
  if (!input.revenue) return null;
  if (!input.knownCosts) return null;
  const fees = input.fees?.amount ?? 0;
  if (input.knownCosts.currency !== input.revenue.currency) return null;
  if (input.fees && input.fees.currency !== input.revenue.currency) return null;
  return {
    amount: input.revenue.amount - input.knownCosts.amount - fees,
    currency: input.revenue.currency,
  };
}

export function calculateMargin(profit: number | null, revenue: number | null): number | null {
  if (profit == null || revenue == null) return null;
  if (!Number.isFinite(profit) || !Number.isFinite(revenue) || revenue === 0) return null;
  return (profit / revenue) * 100;
}

export function formatMargin(margin: number | null): string {
  if (margin == null || !Number.isFinite(margin)) return "—";
  return `${margin.toFixed(1)}%`;
}
