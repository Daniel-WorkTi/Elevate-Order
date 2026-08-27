/**
 * Pure domain constants for WhatsApp Phase 1 schema.
 * No API clients, webhooks, or Meta integration.
 */

export const WHATSAPP_CONNECTION_STATUSES = [
  "pending",
  "connected",
  "disconnected",
  "error",
] as const;

export type WhatsAppConnectionStatus = (typeof WHATSAPP_CONNECTION_STATUSES)[number];

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
