/**
 * Pure domain constants for WhatsApp schema + provider model.
 * No API clients, webhooks, or transport implementations.
 */

export const WHATSAPP_PROVIDERS = ["whatsapp_web", "meta_cloud"] as const;

export type WhatsAppProviderId = (typeof WHATSAPP_PROVIDERS)[number];

export const WHATSAPP_CONNECTION_STATUSES = [
  "disconnected",
  "initializing",
  "qr_ready",
  "connecting",
  "connected",
  "reconnecting",
  "error",
] as const;

export type WhatsAppConnectionStatus = (typeof WHATSAPP_CONNECTION_STATUSES)[number];

/** Legacy Meta status — migrated to `initializing` in 20260828190000. */
export const WHATSAPP_LEGACY_PENDING_STATUS = "pending" as const;

export const WHATSAPP_CONVERSATION_STATUSES = ["open", "closed"] as const;

export type WhatsAppConversationStatus = (typeof WHATSAPP_CONVERSATION_STATUSES)[number];

export const WHATSAPP_MESSAGE_DIRECTIONS = ["inbound", "outbound"] as const;

export type WhatsAppMessageDirection = (typeof WHATSAPP_MESSAGE_DIRECTIONS)[number];

export const WHATSAPP_MESSAGE_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
  "received",
] as const;

export type WhatsAppMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];

export const WHATSAPP_MESSAGE_TYPES = [
  "text",
  "template",
  "interactive",
  "image",
  "document",
  "audio",
  "video",
  "unknown",
] as const;

export type WhatsAppMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

/** Loose E.164 check aligned with DB constraint (+ then 6–15 digits). */
export function isE164Phone(value: string): boolean {
  return /^\+[0-9]{6,15}$/.test(value);
}

export function isWhatsAppProviderId(value: string): value is WhatsAppProviderId {
  return (WHATSAPP_PROVIDERS as readonly string[]).includes(value);
}

export function isWhatsAppConnectionStatus(value: string): value is WhatsAppConnectionStatus {
  return (WHATSAPP_CONNECTION_STATUSES as readonly string[]).includes(value);
}

/** Map legacy/pending rows to the post-migration vocabulary. */
export function normalizeConnectionStatus(value: string): WhatsAppConnectionStatus {
  if (value === WHATSAPP_LEGACY_PENDING_STATUS) return "initializing";
  if (isWhatsAppConnectionStatus(value)) return value;
  return "error";
}
