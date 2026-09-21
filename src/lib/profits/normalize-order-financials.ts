import type { Supply } from "@/lib/order-domain";
import { getOrderSupply } from "@/lib/order-domain";
import type { Money } from "@/lib/money/format-money";
import { calculateProfit } from "@/lib/money/calculate-profit";

export type OrderFinancials = {
  id: string;
  orderId: number;
  orderLabel: string;
  supply: Supply | null;
  source: string;
  date: string | null;
  statusName: string | null;
  revenue: Money | null;
  /** Null until the schema provides supplier/fulfillment/shipping cost fields. */
  knownCosts: Money | null;
  /** Null until the schema provides fee fields. */
  fees: Money | null;
  profit: Money | null;
};

type FinancialOrderRow = {
  id: string;
  order_id: number;
  total: number | null;
  currency: string | null;
  source: string;
  last_event_at: string | null;
  created_at: string | null;
  status_name: string | null;
};

/**
 * Normalize one order into financial fields.
 * Revenue = latest order snapshot `total` (orders table is upserted per order_id — no event double-count).
 * Costs/fees are not invented when absent from the sync payload.
 * Missing/invalid currency → revenue null (counted as skipped by aggregators), never fake EUR.
 */
export function normalizeOrderFinancials(order: FinancialOrderRow): OrderFinancials {
  const code = order.currency?.trim().toUpperCase() ?? "";
  const currency = /^[A-Z]{3}$/.test(code) ? code : null;
  const revenue: Money | null =
    currency && order.total != null && Number.isFinite(order.total)
      ? { amount: order.total, currency }
      : null;

  const knownCosts: Money | null = null;
  const fees: Money | null = null;
  const profit = calculateProfit({ revenue, knownCosts, fees });

  return {
    id: order.id,
    orderId: order.order_id,
    orderLabel: `#${order.order_id}`,
    supply: getOrderSupply({ source: order.source }),
    source: order.source,
    date: order.last_event_at ?? order.created_at,
    statusName: order.status_name,
    revenue,
    knownCosts,
    fees,
    profit,
  };
}
