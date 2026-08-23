import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  aggregateRecovery,
  emptyRecoverySnapshot,
  type RecoveryEventInput,
  type RecoveryOrderInput,
  type RecoverySnapshot,
} from "@/lib/inbox/aggregate-recovery";
import { profitsDateRange, PROFIT_PERIODS, type ProfitPeriod } from "@/lib/profits/profits-search";
import { isMissingWorkspaceColumn, parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";

const inputSchema = z.object({
  period: z.enum(PROFIT_PERIODS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  workspaceId: z.string().optional(),
});

export type RecoveryDashboardResult = {
  snapshot: RecoverySnapshot;
  fetchedAt: string;
  error: string | null;
};

type OrderRow = {
  order_id: number;
  customer_name: string | null;
  source: string;
  total: number | string | null;
  currency: string | null;
  status_name: string | null;
  details: string | null;
  last_event_at: string | null;
  created_at: string | null;
};

type EventRow = {
  order_id: number;
  status_name: string | null;
  details: string | null;
  event_date: string;
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
  return "7d";
}

function inRange(stamp: string | null, fromMs: number | null, toMs: number | null): boolean {
  if (fromMs == null || toMs == null) return true;
  if (!stamp) return true;
  const time = Date.parse(stamp);
  if (Number.isNaN(time)) return true;
  return time >= fromMs && time <= toMs;
}

async function loadEvents(
  queryChunk: (
    ids: number[],
  ) => Promise<{ data: EventRow[] | null; error: { message?: string } | null }>,
  orderIds: number[],
): Promise<Map<number, RecoveryEventInput[]>> {
  const byOrder = new Map<number, RecoveryEventInput[]>();
  if (orderIds.length === 0) return byOrder;

  const chunkSize = 200;
  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize);
    const { data, error } = await queryChunk(chunk);

    if (error) {
      console.error("queryRecoveryDashboard events", error);
      continue;
    }

    for (const row of data ?? []) {
      const list = byOrder.get(row.order_id) ?? [];
      list.push({
        statusName: row.status_name,
        details: row.details,
        at: row.event_date,
      });
      byOrder.set(row.order_id, list);
    }
  }

  return byOrder;
}

export const queryRecoveryDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => inputSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<RecoveryDashboardResult> => {
    const period = parsePeriod(data.period ?? "7d");
    const range = profitsDateRange({
      period,
      from: data.from,
      to: data.to,
    });
    const fetchedAt = new Date().toISOString();
    const fromMs = range.from ? Date.parse(range.from) : null;
    const toMs = range.to ? Date.parse(range.to) : null;
    const workspaceId = parseWorkspaceId(data.workspaceId);

    if (!workspaceId) {
      return { snapshot: emptyRecoverySnapshot(), fetchedAt, error: null };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const fullSelect =
        "order_id, customer_name, source, total, currency, status_name, details, last_event_at, created_at";
      const legacySelect =
        "order_id, source, total, status_name, details, last_event_at, created_at";

      let rows: OrderRow[] | null = null;
      const full = await supabaseAdmin
        .from("orders")
        .select(fullSelect)
        .eq("workspace_id", workspaceId)
        .limit(5000);
      if (full.error && isMissingWorkspaceColumn(full.error.message)) {
        return { snapshot: emptyRecoverySnapshot(), fetchedAt, error: null };
      }
      if (full.error && /column|schema cache|does not exist/i.test(full.error.message ?? "")) {
        const legacy = await supabaseAdmin
          .from("orders")
          .select(legacySelect)
          .eq("workspace_id", workspaceId)
          .limit(5000);
        if (legacy.error) {
          console.error("queryRecoveryDashboard orders", legacy.error);
          return {
            snapshot: emptyRecoverySnapshot(),
            fetchedAt,
            error: "Unable to load recovery data.",
          };
        }
        rows = ((legacy.data ?? []) as Omit<OrderRow, "customer_name" | "currency">[]).map(
          (row) => ({
            ...row,
            customer_name: null,
            currency: null,
          }),
        );
      } else if (full.error) {
        console.error("queryRecoveryDashboard orders", full.error);
        return {
          snapshot: emptyRecoverySnapshot(),
          fetchedAt,
          error: "Unable to load recovery data.",
        };
      } else {
        rows = (full.data ?? []) as OrderRow[];
      }

      const filtered = (rows ?? []).filter((row) => {
        const source = (row.source ?? "").toLowerCase();
        if (!source.includes("dropi") && !source.includes("dropea")) return false;
        if (source.includes("shopify")) return false;
        return inRange(row.last_event_at ?? row.created_at, fromMs, toMs);
      });

      const events = await loadEvents(
        async (ids) => {
          const result = await supabaseAdmin
            .from("order_events")
            .select("order_id, status_name, details, event_date")
            .in("order_id", ids);
          return {
            data: (result.data ?? null) as EventRow[] | null,
            error: result.error,
          };
        },
        filtered.map((row) => row.order_id),
      );

      const orders: RecoveryOrderInput[] = filtered.map((row) => ({
        orderId: row.order_id,
        customerName: row.customer_name,
        source: row.source ?? "",
        total: asNumber(row.total),
        currency: row.currency,
        statusName: row.status_name,
        details: row.details,
        lastEventAt: row.last_event_at ?? row.created_at,
        events: events.get(row.order_id) ?? [],
      }));

      return {
        snapshot: aggregateRecovery(orders, { from: range.from, to: range.to }),
        fetchedAt,
        error: null,
      };
    } catch (error) {
      console.error("queryRecoveryDashboard failed", error);
      return {
        snapshot: emptyRecoverySnapshot(),
        fetchedAt,
        error: "Unable to load recovery data.",
      };
    }
  });
