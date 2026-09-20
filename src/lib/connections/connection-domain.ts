/**
 * Shared connection vocabulary for Onboarding + Connections.
 * Providers remain the source of truth; these types only normalize UI/state.
 */

export const CONNECTION_PROVIDERS = ["shopify", "dropi", "dropea", "whatsapp"] as const;

export type ConnectionProvider = (typeof CONNECTION_PROVIDERS)[number];

export const CONNECTION_STATES = [
  "not_connected",
  "connecting",
  "awaiting_external_action",
  "connected",
  "syncing",
  "reconnecting",
  "error",
] as const;

export type ConnectionState = (typeof CONNECTION_STATES)[number];

export type ConnectionSummary = {
  provider: ConnectionProvider;
  state: ConnectionState;
  displayName: string;
  externalIdentifier: string | null;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
  /** Operator explicitly skipped this provider during onboarding (not connected). */
  skipped: boolean;
};

export function isConnectionProvider(value: string): value is ConnectionProvider {
  return (CONNECTION_PROVIDERS as readonly string[]).includes(value);
}

export function isConnectionState(value: string): value is ConnectionState {
  return (CONNECTION_STATES as readonly string[]).includes(value);
}

/** Selection / skip must never become Connected. */
export function connectionStateFromSkip(skipped: boolean, state: ConnectionState): ConnectionState {
  if (skipped && state === "connected") {
    // Backend truth wins over skip flag for display of live connection.
    return state;
  }
  return state;
}

export function mapShopifyConnectionState(input: {
  connected: boolean;
  connecting?: boolean;
  syncing?: boolean;
  error?: boolean;
}): ConnectionState {
  if (input.error) return "error";
  if (input.syncing) return "syncing";
  if (input.connecting) return "connecting";
  if (input.connected) return "connected";
  return "not_connected";
}

/** Dropi: configured = webhook ready, waiting for first event. */
export function mapDropiConnectionState(
  status: "connected" | "configured" | "error" | "not_configured",
): ConnectionState {
  switch (status) {
    case "connected":
      return "connected";
    case "configured":
      return "awaiting_external_action";
    case "error":
      return "error";
    case "not_configured":
    default:
      return "not_connected";
  }
}

export function mapDropeaConnectionState(
  status: "connected" | "configured" | "error" | "not_configured",
  opts?: { syncing?: boolean },
): ConnectionState {
  if (opts?.syncing) return "syncing";
  switch (status) {
    case "connected":
      return "connected";
    case "configured":
      return "awaiting_external_action";
    case "error":
      return "error";
    case "not_configured":
    default:
      return "not_connected";
  }
}

/**
 * Map WhatsApp gateway/DB statuses.
 * `reconnecting` only when the provider reports reconnecting (prior session restore).
 * `qr_ready` → connecting (QR available is part of connect flow).
 */
export function mapWhatsAppConnectionState(
  status:
    | "disconnected"
    | "initializing"
    | "qr_ready"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error"
    | string
    | null
    | undefined,
): ConnectionState {
  switch (status) {
    case "connected":
      return "connected";
    case "reconnecting":
      return "reconnecting";
    case "qr_ready":
    case "connecting":
    case "initializing":
      return "connecting";
    case "error":
      return "error";
    case "disconnected":
    default:
      return "not_connected";
  }
}

export function isConnectedState(state: ConnectionState): boolean {
  return state === "connected";
}

/** Ready-row label key helper: skipped and not connected → setup later. */
export function readyRowKind(
  state: ConnectionState,
  skipped: boolean,
): "connected" | "pending" | "skipped" | "error" {
  if (state === "connected") return "connected";
  if (state === "error") return "error";
  if (skipped) return "skipped";
  return "pending";
}

export function buildConnectionSummary(input: {
  provider: ConnectionProvider;
  state: ConnectionState;
  displayName: string;
  externalIdentifier?: string | null;
  lastSuccessfulSyncAt?: string | null;
  lastError?: string | null;
  skipped?: boolean;
}): ConnectionSummary {
  return {
    provider: input.provider,
    state: input.state,
    displayName: input.displayName,
    externalIdentifier: input.externalIdentifier ?? null,
    lastSuccessfulSyncAt: input.lastSuccessfulSyncAt ?? null,
    lastError: input.lastError ?? null,
    skipped: Boolean(input.skipped),
  };
}
