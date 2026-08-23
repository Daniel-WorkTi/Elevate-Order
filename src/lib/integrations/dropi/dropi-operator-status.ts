import type {
  DropiConnectionStatus,
  DropiConnectionSummary,
} from "@/lib/integrations/dropi/dropi-types";

/**
 * Operator-facing status.
 * Once the operator clicks Connect (linked), show Connected — do not wait for
 * the first webhook event.
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

  return "connected";
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
