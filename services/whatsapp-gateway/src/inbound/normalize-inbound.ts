import type { WAMessage } from "@whiskeysockets/baileys";

import { phoneFromBaileysUserId } from "../baileys/auth-state.js";
import { isE164Phone } from "../phone-e164.js";
import type { NormalizedInboundMessage } from "./inbound-types.js";

export type { NormalizedInboundMessage } from "./inbound-types.js";

function extractText(message: WAMessage["message"]): string | null {
  if (!message) return null;
  if (typeof message.conversation === "string" && message.conversation.trim()) {
    return message.conversation.trim();
  }
  const extended = message.extendedTextMessage?.text;
  if (typeof extended === "string" && extended.trim()) return extended.trim();
  return null;
}

function isIgnoredJid(jid: string | null | undefined): boolean {
  if (!jid) return true;
  if (jid === "status@broadcast") return true;
  if (jid.endsWith("@g.us")) return true;
  if (jid.endsWith("@broadcast")) return true;
  return false;
}

function phoneFromPnJid(jid: string | null | undefined): string | null {
  if (!jid?.endsWith("@s.whatsapp.net")) return null;
  const phone = phoneFromBaileysUserId(jid);
  if (!phone || !isE164Phone(phone)) return null;
  return phone;
}

function isLidJid(jid: string | null | undefined): boolean {
  return Boolean(jid?.includes("@lid"));
}

/** Resolve customer E.164 from Baileys key — prefers PN JID over WhatsApp LID privacy ids. */
export async function resolveInboundSenderPhone(
  key: WAMessage["key"],
  resolvePnForLid?: (lidJid: string) => Promise<string | null>,
): Promise<string | null> {
  if (!key) return null;

  const pnCandidates = [key.remoteJidAlt, key.remoteJid];
  for (const jid of pnCandidates) {
    const phone = phoneFromPnJid(jid);
    if (phone) return phone;
  }

  const lidJid = [key.remoteJid, key.remoteJidAlt].find(isLidJid);
  if (lidJid && resolvePnForLid) {
    const pnJid = await resolvePnForLid(lidJid);
    const phone = phoneFromPnJid(pnJid);
    if (phone) return phone;
  }

  return null;
}

/** Baileys message → provider-agnostic inbound event. Returns null when safely ignored. */
export async function normalizeInboundMessage(input: {
  workspaceId: string;
  connectionId: string;
  message: WAMessage;
  resolvePnForLid?: (lidJid: string) => Promise<string | null>;
}): Promise<NormalizedInboundMessage | null> {
  const { message } = input;
  const key = message.key;
  if (!key || key.fromMe) return null;

  const remoteJid = key.remoteJid ?? null;
  if (isIgnoredJid(remoteJid)) return null;

  const externalMessageId = key.id;
  if (!externalMessageId) return null;

  const text = extractText(message.message);
  if (!text) return null;

  const fromDigits = await resolveInboundSenderPhone(key, input.resolvePnForLid);
  if (!fromDigits) return null;

  const timestampMs = Number(message.messageTimestamp ?? Date.now());
  const ts = Number.isFinite(timestampMs)
    ? new Date(timestampMs * 1000).toISOString()
    : new Date().toISOString();

  return {
    provider: "whatsapp_web",
    workspaceId: input.workspaceId,
    connectionId: input.connectionId,
    externalMessageId,
    direction: "inbound",
    from: fromDigits,
    type: "text",
    text,
    timestamp: ts,
  };
}
