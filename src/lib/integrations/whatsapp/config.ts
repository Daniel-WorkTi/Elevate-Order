import { z } from "zod";

export const DEFAULT_META_GRAPH_VERSION = "v21.0";
export const DEFAULT_META_SDK_VERSION = "v21.0";

const trim = (value: string | undefined) => value?.trim() ?? "";

/** Strip accidental `<>` wrappers or a duplicated App ID prefix from Embedded Signup config ids. */
export function normalizeEmbeddedSignupConfigId(
  configIdRaw: string,
  appId: string,
): string {
  const cleaned = configIdRaw.replace(/^<|>$/g, "").trim();
  if (!cleaned || !appId) return cleaned;
  if (cleaned.startsWith(appId) && cleaned.length > appId.length) {
    return cleaned.slice(appId.length);
  }
  return cleaned;
}

/** Public values safe to expose to authenticated browsers. */
export type WhatsAppPublicConfig = {
  appId: string;
  configId: string;
};

/** Server-only Meta + encryption configuration. */
export type WhatsAppServerConfig = WhatsAppPublicConfig & {
  appSecret: string;
  graphVersion: string;
  sdkVersion: string;
  redirectUri: string | null;
  tokenEncryptionKeyBase64: string;
};

const publicEnvSchema = z.object({
  appId: z.string().min(1),
  configId: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  appSecret: z.string().min(1),
  graphVersion: z.string().min(1),
  sdkVersion: z.string().min(1),
  redirectUri: z.string().url().nullable(),
  tokenEncryptionKeyBase64: z.string().min(1),
});

function readPublicEnv() {
  const appId = trim(process.env["META_APP_ID"]) || trim(process.env["FACEBOOK_APP_ID"]);
  const configIdRaw =
    trim(process.env["META_WHATSAPP_CONFIG_ID"]) ||
    trim(process.env["META_EMBEDDED_SIGNUP_CONFIG_ID"]) ||
    trim(process.env["META_CONFIG_ID"]);
  const configId = normalizeEmbeddedSignupConfigId(configIdRaw, appId);
  return { appId, configId };
}

function readServerEnv() {
  const pub = readPublicEnv();
  const appSecret =
    trim(process.env["META_APP_SECRET"]) || trim(process.env["FACEBOOK_APP_SECRET"]);
  const graphVersion = trim(process.env["META_GRAPH_API_VERSION"]) || DEFAULT_META_GRAPH_VERSION;
  const sdkVersion = trim(process.env["META_SDK_VERSION"]) || graphVersion;
  const redirectRaw = trim(process.env["META_REDIRECT_URI"]);
  const tokenEncryptionKeyBase64 = trim(process.env["WHATSAPP_TOKEN_ENCRYPTION_KEY"]);
  return {
    ...pub,
    appSecret,
    graphVersion,
    sdkVersion,
    redirectUri: redirectRaw || null,
    tokenEncryptionKeyBase64,
  };
}

export function getWhatsAppPublicConfig(): WhatsAppPublicConfig {
  const parsed = publicEnvSchema.safeParse(readPublicEnv());
  if (!parsed.success) {
    throw new Error("WHATSAPP_NOT_CONFIGURED");
  }
  return parsed.data;
}

export function tryGetWhatsAppPublicConfig(): WhatsAppPublicConfig | null {
  const parsed = publicEnvSchema.safeParse(readPublicEnv());
  return parsed.success ? parsed.data : null;
}

export function getWhatsAppServerConfig(): WhatsAppServerConfig {
  const parsed = serverEnvSchema.safeParse(readServerEnv());
  if (!parsed.success) {
    throw new Error("WHATSAPP_NOT_CONFIGURED");
  }
  return parsed.data;
}

export function isWhatsAppServerConfigured(): boolean {
  return serverEnvSchema.safeParse(readServerEnv()).success;
}
