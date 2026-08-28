import { DisconnectReason } from "@whiskeysockets/baileys";

export type DisconnectKind = "restart" | "recoverable" | "fatal" | "unknown";

export type DisconnectDecision = {
  kind: DisconnectKind;
  shouldReconnect: boolean;
  clearAuth: boolean;
  resetBackoff: boolean;
};

const FATAL_CODES = new Set<number>([
  DisconnectReason.loggedOut,
  DisconnectReason.badSession,
  DisconnectReason.forbidden,
  DisconnectReason.multideviceMismatch,
]);

const RECOVERABLE_CODES = new Set<number>([
  DisconnectReason.connectionClosed,
  DisconnectReason.connectionLost,
  DisconnectReason.timedOut,
  DisconnectReason.unavailableService,
  DisconnectReason.connectionReplaced,
]);

/** Classify Baileys disconnect — recoverable vs session revoked. */
export function classifyDisconnect(statusCode: number | undefined): DisconnectDecision {
  if (statusCode === DisconnectReason.restartRequired) {
    return {
      kind: "restart",
      shouldReconnect: true,
      clearAuth: false,
      resetBackoff: true,
    };
  }

  if (statusCode !== undefined && FATAL_CODES.has(statusCode)) {
    return {
      kind: "fatal",
      shouldReconnect: false,
      clearAuth: true,
      resetBackoff: true,
    };
  }

  if (statusCode !== undefined && RECOVERABLE_CODES.has(statusCode)) {
    return {
      kind: "recoverable",
      shouldReconnect: true,
      clearAuth: false,
      resetBackoff: false,
    };
  }

  return {
    kind: "unknown",
    shouldReconnect: true,
    clearAuth: false,
    resetBackoff: false,
  };
}

const BACKOFF_SCHEDULE_MS = [1000, 2000, 5000, 10000] as const;
const MAX_BACKOFF_MS = 10000;

/** Backoff with jitter — attempt is 1-based. */
export function reconnectDelayMs(attempt: number): number {
  const index = Math.max(0, Math.min(attempt - 1, BACKOFF_SCHEDULE_MS.length - 1));
  const base = BACKOFF_SCHEDULE_MS[index] ?? MAX_BACKOFF_MS;
  const jitter = Math.floor(Math.random() * base * 0.2);
  return base + jitter;
}
