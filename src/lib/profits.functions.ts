import { createServerFn } from "@tanstack/react-start";

import {
  normalizeOrderFinancials,
  type OrderFinancials,
} from "@/lib/profits/normalize-order-financials";
import {
  matchesSupplyFilter,
  profitsDateRange,
  PROFIT_PERIODS,
  type ProfitPeriod,
  type ProfitsSupplyFilter,
} from "@/lib/profits/profits-search";

type OrdersRow = {
  id: string;
  order_id: number;
  total: number | string | null;
  source: string;
  status_name: string | null;
  last_event_at: string | null;
  created_at: string | null;
};

function asNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePeriod(value: unknown): ProfitPeriod {
  if (typeof value === "string" && (PROFIT_PERIODS as readonly string[]).includes(value)) {
    return value as ProfitPeriod;
  }
  return "all";
}

function parseSupplyFilter(value: unknown): ProfitsSupplyFilter {
  if (value === "dropi" || value === "dropea" || value === "all") return value;
  return "all";
}

export type ProfitsQueryResult = {
  orders: OrderFinancials[];
  error: string | null;
  meta: {
    from: string | null;
    to: string | null;
    supply: ProfitsSupplyFilter;
    hasCostData: boolean;
    hasFeeData: boolean;
    /** Orders matching supply before date filter — helps empty-state messaging. */
    supplyMatchCount: number;
  };
};

function emptyResult(
  supply: ProfitsSupplyFilter,
  period: ProfitPeriod,
  from: string | undefined,
  to: string | undefined,
  error: string,
  supplyMatchCount = 0,
): ProfitsQueryResult {
  const range = profitsDateRange({ period, from, to });
  return {
    orders: [],
    error,
    meta: {
      from: range.from,
      to: range.to,
      supply,
      hasCostData: false,
      hasFeeData: false,
      supplyMatchCount,
    },
  };
}

export const queryProfitsOrders = createServerFn({ method: "POST" })
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    const parsed: {
      supply: ProfitsSupplyFilter;
      period: ProfitPeriod;
      from?: string;
      to?: string;
    } = {
      supply: parseSupplyFilter(raw["supply"]),
      period: parsePeriod(raw["period"]),
    };
    if (typeof raw["from"] === "string" && raw["from"].trim()) parsed.from = raw["from"].trim();
    if (typeof raw["to"] === "string" && raw["to"].trim()) parsed.to = raw["to"].trim();
    return parsed;
  })
  .handler(async ({ data }): Promise<ProfitsQueryResult> => {
    const range = profitsDateRange({
      period: data.period,
      from: data.from,
      to: data.to,
    });

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: rows, error } = await supabaseAdmin
        .from("orders")
        .select("id, order_id, total, source, status_name, last_event_at, created_at")
        .order("last_event_at", { ascending: false })
        .limit(5000);

      if (error) {
        console.error("queryProfitsOrders supabase error", error);
        return emptyResult(
          data.supply,
          data.period,
          data.from,
          data.to,
          "Unable to load profit data.",
        );
      }

      const supplyMatched = ((rows ?? []) as OrdersRow[]).filter((row) =>
        matchesSupplyFilter(row.source ?? "", data.supply),
      );

      const fromMs = range.from ? Date.parse(range.from) : null;
      const toMs = range.to ? Date.parse(range.to) : null;

      const filtered = supplyMatched.filter((row) => {
        if (fromMs == null || toMs == null) return true;
        const stamp = row.last_event_at ?? row.created_at;
        if (!stamp) return true; // keep undated rows when a range is set
        const time = Date.parse(stamp);
        if (Number.isNaN(time)) return true;
        return time >= fromMs && time <= toMs;
      });

      const orders = filtered.map((row) =>
        normalizeOrderFinancials({
          id: row.id,
          order_id: row.order_id,
          total: asNumber(row.total),
          currency: null,
          source: row.source ?? "",
          last_event_at: row.last_event_at,
          created_at: row.created_at,
          status_name: row.status_name,
        }),
      );

      return {
        orders,
        error: null,
        meta: {
          from: range.from,
          to: range.to,
          supply: data.supply,
          hasCostData: false,
          hasFeeData: false,
          supplyMatchCount: supplyMatched.length,
        },
      };
    } catch (error) {
      console.error("queryProfitsOrders failed", error);
      const detail =
        error instanceof Error && /Missing Supabase environment variable/i.test(error.message)
          ? "Unable to load profit data. Check the Supabase connection."
          : "Unable to load profit data.";
      return emptyResult(data.supply, data.period, data.from, data.to, detail);
    }
  });

export type { OrderFinancials };
