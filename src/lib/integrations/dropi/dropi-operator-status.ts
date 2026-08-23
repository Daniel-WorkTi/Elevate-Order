import type {
  DropiConnectionStatus,
  DropiConnectionSummary,
} from "@/lib/integrations/dropi/dropi-types";

/**
 * Operator-facing status.
 * Linking the workspace is not the same as receiving orders. Stay on
 * "configured" until this workspace has at least one Dropi webhook/order.
 */
export function resolveDropiOperatorStatus(input: {
  linked: boolean;
  summary: DropiConnectionSummary;
}): DropiConnectionStatus {
  const { linked, summary } = input;

  if (!summary.serverConfigured || !summary.authConfigured) {
    return summary.status === "error" ? "error" : "not_configured";
  }

  if (!linked) return "not_configured";

  if (summary.status === "error" && summary.errorMessage) {
    return "error";
  }

  const hasEvents =
    Boolean(summary.lastWebhookAt) ||
    Boolean(summary.lastSuccessfulEventAt) ||
    (summary.orderCount ?? 0) > 0;

  return hasEvents ? "connected" : "configured";
}

export function applyOperatorDropiSummary(
  summary: DropiConnectionSummary,
  linked: boolean,
): DropiConnectionSummary {
  const status = resolveDropiOperatorStatus({ linked, summary });

  if (!linked) {
    return {
      ...summary,
      status,
      // Do not present shared/historical sync as this operator's connection yet.
      lastWebhookAt: null,
      lastSuccessfulEventAt: null,
      orderCount: null,
      eventsToday: null,
      failedEventsToday: null,
      errorMessage:
        summary.serverConfigured && summary.authConfigured
          ? null
          : summary.errorMessage,
    };
  }

  return { ...summary, status };
}
