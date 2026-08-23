import { randomBytes } from "node:crypto";

export function randomWebhookToken() {
  return `elevate_wh_${randomBytes(24).toString("hex")}`;
}
