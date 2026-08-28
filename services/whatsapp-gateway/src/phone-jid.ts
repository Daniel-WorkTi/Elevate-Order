import type { WASocket } from "@whiskeysockets/baileys";

/** Convert E.164 (+351912345678) to Baileys user JID — gateway only. */
export function e164ToBaileysJid(e164: string): string {
  const digits = e164.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) {
    throw new Error("invalid_recipient");
  }
  return `${digits}@s.whatsapp.net`;
}

export function e164Digits(e164: string): string {
  return e164.replace(/\D/g, "");
}

/** Resolve the best outbound JID (PN/LID/self) before Baileys send. */
export async function resolveOutboundJid(
  socket: WASocket,
  e164: string,
  selfUserId?: string | null,
): Promise<string> {
  const targetDigits = e164Digits(e164);
  const pnJid = e164ToBaileysJid(e164);

  if (selfUserId) {
    const selfLocal = selfUserId.split("@")[0]?.split(":")[0] ?? "";
    if (selfLocal && selfLocal === targetDigits) {
      return selfUserId.includes("@") ? selfUserId : `${selfUserId}@s.whatsapp.net`;
    }
  }

  if (typeof socket.onWhatsApp === "function") {
    try {
      const lookup = await socket.onWhatsApp(targetDigits);
      const hit = lookup?.[0];
      if (hit?.exists && hit.jid) return hit.jid;
    } catch {
      /* fall back to PN jid */
    }
  }

  return pnJid;
}
