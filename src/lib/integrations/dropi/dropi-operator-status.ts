import type {
  DropiConnectionStatus,
  DropiConnectionSummary,
} from "@/lib/integrations/dropi/dropi-types";

/**
 * Operator-facing Dropi status from backend reality only.
 * Never treat a browser localStorage flag as Connected.
 */
export function resolveDropiOperatorStatus(summary: DropiConnectionSummary): DropiConnectionStatus {
  if (!summary.serverConfigured || !summary.authConfigured) {
    return summary.status === "error" ? "error" : "not_configured";
  }
  if (summary.status === "error") return "error";
  if ((summary.orderCount ?? 0) > 0 || summary.lastSuccessfulEventAt || summary.lastWebhookAt) {
    return "connected";
  }
  return "configured";
}

export function applyOperatorDropiSummary(summary: DropiConnectionSummary): DropiConnectionSummary {
  return {
    ...summary,
    status: resolveDropiOperatorStatus(summary),
  };
}
