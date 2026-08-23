import { createServerFn } from "@tanstack/react-start";
import { startOfDay } from "date-fns";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  DROPEA_API_BASE,
  type DropeaConnectionStatus,
  type DropeaDashboardResult,
} from "@/lib/integrations/dropea/dropea-types";
import { buildWebhookRelativeUrl } from "@/lib/integrations/webhook-auth";

function envPresent(name: string) {
  return Boolean(process.env[name]?.trim());
}

function deriveInfraStatus(input: {
  serverConfigured: boolean;
  hasOrders: boolean;
  queryFailed: boolean;
}): DropeaConnectionStatus {
  if (!input.serverConfigured) return "not_configured";
  if (input.queryFailed) return "error";
  if (input.hasOrders) return "connected";
  return "configured";
}

export const getDropeaDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
  async (): Promise<DropeaDashboardResult> => {
    const serverConfigured =
      envPresent("SUPABASE_SERVICE_ROLE_KEY") && envPresent("SUPABASE_URL");
    const webhookRelativeUrl = buildWebhookRelativeUrl();

    const empty = {
      status: deriveInfraStatus({
        serverConfigured,
        hasOrders: false,
        queryFailed: false,
      }),
      method: "api" as const,
      apiBaseUrl: DROPEA_API_BASE,
      webhookRelativeUrl,
      serverConfigured,
      lastSyncAt: null,
      orderCount: null,
      eventsToday: null,
      errorMessage: serverConfigured
        ? null
        : "Server synchronization is not fully configured.",
    };

    if (!serverConfigured) {
      return {
        summary: { ...empty, status: "not_configured" },
        recentEvents: [],
        error: empty.errorMessage,
      };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const todayIso = startOfDay(new Date()).toISOString();

      const [ordersCountRes, latestRes, todayCountRes, eventsRes] = await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("order_id", { count: "exact", head: true })
          .ilike("source", "%dropea%"),
        supabaseAdmin
          .from("orders")
          .select("last_event_at, source")
          .ilike("source", "%dropea%")
          .order("last_event_at", { ascending: false })
          .limit(1),
        supabaseAdmin
          .from("order_events")
          .select("id", { count: "exact", head: true })
          .ilike("source", "%dropea%")
          .gte("event_date", todayIso),
        supabaseAdmin
          .from("order_events")
          .select("id, order_id, event_date, status_name, details")
          .ilike("source", "%dropea%")
          .order("event_date", { ascending: false })
          .limit(8),
      ]);

      if (ordersCountRes.error || latestRes.error || todayCountRes.error) {
        console.error("getDropeaDashboard failed", {
          orders: ordersCountRes.error,
          latest: latestRes.error,
          today: todayCountRes.error,
        });
        return {
          summary: {
            ...empty,
            status: "error",
            errorMessage: "Unable to load Dropea synchronization data.",
          },
          recentEvents: [],
          error: "Unable to load Dropea synchronization data.",
        };
      }

      const orderCount = ordersCountRes.count ?? 0;
      const lastSyncAt = latestRes.data?.[0]?.last_event_at ?? null;
      const recentEvents = (eventsRes.data ?? []).map((row) => ({
        id: String(row.id),
        orderId: Number(row.order_id),
        eventDate: String(row.event_date),
        statusName: (row.status_name as string | null) ?? null,
        details: (row.details as string | null) ?? null,
      }));

      return {
        summary: {
          status: deriveInfraStatus({
            serverConfigured,
            hasOrders: orderCount > 0,
            queryFailed: false,
          }),
          method: "api",
          apiBaseUrl: DROPEA_API_BASE,
          webhookRelativeUrl,
          serverConfigured,
          lastSyncAt,
          orderCount,
          eventsToday: todayCountRes.count ?? 0,
          errorMessage: null,
        },
        recentEvents,
        error: null,
      };
    } catch (error) {
      console.error("getDropeaDashboard failed", error);
      return {
        summary: {
          ...empty,
          status: "error",
          errorMessage: "Unable to load Dropea synchronization data.",
        },
        recentEvents: [],
        error: "Unable to load Dropea synchronization data.",
      };
    }
  },
);
