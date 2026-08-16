import { createServerFn } from "@tanstack/react-start";
import { startOfDay } from "date-fns";

import { DROPI_WEBHOOK_FIELDS, DROPI_WEBHOOK_PATH } from "@/lib/integrations/dropi/dropi-fields";
import type {
  DropiConnectionStatus,
  DropiDashboardResult,
  DropiWebhookEventRow,
} from "@/lib/integrations/dropi/dropi-types";

function envPresent(name: string) {
  const value = process.env[name]?.trim();
  return Boolean(value);
}

function mapEvent(row: {
  id: string;
  order_id: number;
  event_date: string;
  status_name: string | null;
  details: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_company: string | null;
  total: number | string | null;
  source: string;
  raw: unknown;
}): DropiWebhookEventRow {
  const total =
    typeof row.total === "number"
      ? row.total
      : row.total != null
        ? Number.parseFloat(String(row.total))
        : null;

  const rawJson =
    row.raw == null
      ? null
      : (() => {
          try {
            return JSON.stringify(row.raw, null, 2);
          } catch {
            return null;
          }
        })();

  return {
    id: row.id,
    orderId: row.order_id,
    eventDate: row.event_date,
    statusName: row.status_name,
    details: row.details,
    trackingCode: row.tracking_code,
    trackingUrl: row.tracking_url,
    shippingCompany: row.shipping_company,
    total: Number.isFinite(total) ? total : null,
    source: row.source,
    result: "processed",
    rawJson,
  };
}

function deriveStatus(input: {
  authConfigured: boolean;
  serverConfigured: boolean;
  hasEvents: boolean;
  queryFailed: boolean;
}): DropiConnectionStatus {
  // Infrastructure-only signal for the server. Operator "Connected" is decided client-side
  // after the user explicitly links Dropi for their workspace.
  if (!input.authConfigured || !input.serverConfigured) return "not_configured";
  if (input.queryFailed) return "error";
  if (input.hasEvents) return "connected";
  return "configured";
}

export const getDropiDashboard = createServerFn({ method: "GET" }).handler(
  async (): Promise<DropiDashboardResult> => {
    const authConfigured = envPresent("SUPABASE_PUBLISHABLE_KEY");
    const serverConfigured = envPresent("SUPABASE_SERVICE_ROLE_KEY") && envPresent("SUPABASE_URL");

    const emptySummary = {
      status: deriveStatus({
        authConfigured,
        serverConfigured,
        hasEvents: false,
        queryFailed: false,
      }),
      method: "webhook" as const,
      webhookPath: DROPI_WEBHOOK_PATH,
      authConfigured,
      serverConfigured,
      lastWebhookAt: null,
      lastSuccessfulEventAt: null,
      orderCount: null,
      eventsToday: null,
      failedEventsToday: null,
      errorMessage: !serverConfigured
        ? "Server synchronization is not fully configured."
        : !authConfigured
          ? "Webhook authentication is not configured."
          : null,
    };

    if (!serverConfigured) {
      return {
        summary: { ...emptySummary, status: "not_configured" },
        fields: [...DROPI_WEBHOOK_FIELDS],
        recentEvents: [],
        error: emptySummary.errorMessage,
      };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const todayIso = startOfDay(new Date()).toISOString();

      const [ordersCountRes, eventsRes, todayCountRes] = await Promise.all([
        supabaseAdmin
          .from("orders")
          .select("order_id", { count: "exact", head: true })
          .ilike("source", "%dropi%")
          .not("source", "ilike", "%dropea%"),
        supabaseAdmin
          .from("order_events")
          .select(
            "id, order_id, event_date, status_name, details, tracking_code, tracking_url, shipping_company, total, source, raw, created_at",
          )
          .ilike("source", "%dropi%")
          .not("source", "ilike", "%dropea%")
          .order("event_date", { ascending: false })
          .limit(40),
        supabaseAdmin
          .from("order_events")
          .select("id", { count: "exact", head: true })
          .ilike("source", "%dropi%")
          .not("source", "ilike", "%dropea%")
          .gte("event_date", todayIso),
      ]);

      if (ordersCountRes.error || eventsRes.error || todayCountRes.error) {
        console.error("getDropiDashboard query failed", {
          orders: ordersCountRes.error,
          events: eventsRes.error,
          today: todayCountRes.error,
        });
        return {
          summary: {
            ...emptySummary,
            status: "error",
            errorMessage: "Unable to load Dropi synchronization data.",
          },
          fields: [...DROPI_WEBHOOK_FIELDS],
          recentEvents: [],
          error: "Unable to load Dropi synchronization data.",
        };
      }

      const dropiEvents = (eventsRes.data ?? []).map(mapEvent);
      const orderCount = ordersCountRes.count ?? 0;
      const eventsToday = todayCountRes.count ?? 0;

      const lastEvent = dropiEvents[0] ?? null;
      const lastAt = lastEvent?.eventDate ?? null;
      const hasEvents = dropiEvents.length > 0 || orderCount > 0;

      return {
        summary: {
          status: deriveStatus({
            authConfigured,
            serverConfigured,
            hasEvents,
            queryFailed: false,
          }),
          method: "webhook",
          webhookPath: DROPI_WEBHOOK_PATH,
          authConfigured,
          serverConfigured,
          lastWebhookAt: lastAt,
          lastSuccessfulEventAt: lastAt,
          orderCount,
          eventsToday,
          failedEventsToday: null,
          errorMessage: null,
        },
        fields: [...DROPI_WEBHOOK_FIELDS],
        recentEvents: dropiEvents,
        error: null,
      };
    } catch (error) {
      console.error("getDropiDashboard failed", error);
      return {
        summary: {
          ...emptySummary,
          status: "error",
          errorMessage: "Unable to load Dropi synchronization data.",
        },
        fields: [...DROPI_WEBHOOK_FIELDS],
        recentEvents: [],
        error: "Unable to load Dropi synchronization data.",
      };
    }
  },
);
