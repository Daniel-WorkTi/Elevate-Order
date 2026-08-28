import { fetchLatestBaileysVersion, type WAVersion } from "@whiskeysockets/baileys";

const VERSION_TTL_MS = 24 * 60 * 60 * 1000;

let cached: { version: WAVersion; fetchedAt: number } | null = null;

/** Avoid hitting WhatsApp on every socket — version changes rarely. */
export async function getCachedBaileysVersion(): Promise<WAVersion> {
  if (cached && Date.now() - cached.fetchedAt < VERSION_TTL_MS) {
    return cached.version;
  }
  const { version } = await fetchLatestBaileysVersion();
  cached = { version, fetchedAt: Date.now() };
  return version;
}
