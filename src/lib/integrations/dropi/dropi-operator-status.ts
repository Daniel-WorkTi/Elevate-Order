import type {
  DropiConnectionStatus,
  DropiConnectionSummary,
} from "@/lib/integrations/dropi/dropi-types";

/**
 * Operator-facing status: never Connected/Configured until the user links Dropi.
 * Server env readiness alone must not imply the workspace is connected.
 */
export function resolveDropiOperatorStatus(input: {
  linked: boolean;
  summary: DropiConnectionSummary;
}): DropiConnectionStatus {
  const { linked, summary } = input;

  if (!summary.serverConfigured || !summary.authConfigured) {
    return summary.status === "error" ? "error" : "not_configured";
  }

  if (summary.status === "error" && summary.errorMessage) {
    // Infrastructure errors still surface when linked; otherwise stay not configured.
    if (linked) return "error";
  }

  if (!linked) return "not_configured";

  if (summary.lastWebhookAt || (summary.orderCount ?? 0) > 0) {
    return "connected";
  }

  return "configured";
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
