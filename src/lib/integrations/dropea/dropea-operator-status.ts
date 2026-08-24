import type {
  DropeaConnectionStatus,
  DropeaConnectionSummary,
} from "@/lib/integrations/dropea/dropea-types";

/**
 * Once credentials are saved and linked, show Connected (like Shopify / Dropi).
 */
export function resolveDropeaOperatorStatus(input: {
  linked: boolean;
  apiTokenConfigured: boolean;
  hmacSecretConfigured: boolean;
  summary: DropeaConnectionSummary;
}): DropeaConnectionStatus {
  const { linked, apiTokenConfigured, hmacSecretConfigured, summary } = input;

  if (!summary.serverConfigured) {
    return summary.status === "error" ? "error" : "not_configured";
  }

  if (!linked || !apiTokenConfigured || !hmacSecretConfigured) {
    return "not_configured";
  }

  if (summary.status === "error" && summary.errorMessage) return "error";

  return "connected";
}

export function applyOperatorDropeaSummary(
  summary: DropeaConnectionSummary,
  linked: boolean,
  apiTokenConfigured: boolean,
  hmacSecretConfigured: boolean,
): DropeaConnectionSummary {
  const status = resolveDropeaOperatorStatus({
    linked,
    apiTokenConfigured,
    hmacSecretConfigured,
    summary,
  });

  if (!linked) {
    return {
      ...summary,
      status,
      lastSyncAt: null,
      orderCount: null,
      eventsToday: null,
      errorMessage: summary.serverConfigured ? null : summary.errorMessage,
    };
  }

  return { ...summary, status };
}
