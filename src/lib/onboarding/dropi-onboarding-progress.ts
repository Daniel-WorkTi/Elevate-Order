/**
 * Dropi onboarding progression helpers.
 *
 * configured_by_user (checkbox) ≠ connected/verified (first real webhook).
 * Domain status "configured" / connection-domain "awaiting_external_action"
 * is the closest backend analogue once a workspace webhook endpoint exists.
 */

import type { DropiConnectionStatus } from "@/lib/integrations/dropi/dropi-types";
import { isConnectedState, mapDropiConnectionState } from "@/lib/connections/connection-domain";

/** User confirmed they pasted+saved the webhook in Dropi (not technical verification). */
export function canProgressDropiOnboarding(input: {
  backendStatus: DropiConnectionStatus;
  configuredByUser: boolean;
}): boolean {
  if (isConnectedState(mapDropiConnectionState(input.backendStatus))) return true;
  return input.configuredByUser;
}

/** Real Connected only after a valid inbound Dropi event (backend). */
export function isDropiTechnicallyConnected(status: DropiConnectionStatus): boolean {
  return status === "connected";
}

/** Copying the URL alone never verifies the integration. */
export function copyDoesNotConnect(): false {
  return false;
}
