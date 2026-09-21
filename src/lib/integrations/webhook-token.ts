import { randomBytes } from "node:crypto";

/** Opaque per-workspace webhook identity. Never embeds user/workspace ids. */
export function randomWebhookToken(): string {
  return `elevate_wh_${randomBytes(24).toString("hex")}`;
}

/** 24 bytes → 48 hex chars after elevate_wh_ prefix. */
export function isOpaqueWebhookToken(token: string): boolean {
  return /^elevate_wh_[a-f0-9]{48}$/i.test(token.trim());
}
