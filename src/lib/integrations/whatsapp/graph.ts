import type { WhatsAppServerConfig } from "@/lib/integrations/whatsapp/config";
import { sanitizeMetaErrorForLog } from "@/lib/integrations/whatsapp/errors";
import { isE164Phone } from "@/lib/whatsapp/domain-types";

export type GraphFetch = typeof fetch;

export type MetaAccessTokenResponse = {
  accessToken: string;
  tokenType: string | null;
  expiresIn: number | null;
};

export type MetaDebugTokenResult = {
  wabaIds: string[];
  phoneNumberIds: string[];
  expiresAt: number | null;
  isValid: boolean;
};

export type MetaPhoneNumberDetails = {
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
};

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

const DEFAULT_TIMEOUT_MS = 15_000;

function graphVersion(version: string): string {
  return version.startsWith("v") ? version : `v${version}`;
}

function graphBaseUrl(config: WhatsAppServerConfig): string {
  return `https://graph.facebook.com/${graphVersion(config.graphVersion)}`;
}

async function graphRequest<T>(
  config: WhatsAppServerConfig,
  path: string,
  init: RequestInit & { searchParams?: Record<string, string> } = {},
  fetchImpl: GraphFetch = fetch,
): Promise<T> {
  const url = new URL(`${graphBaseUrl(config)}${path.startsWith("/") ? path : `/${path}`}`);
  if (init.searchParams) {
    for (const [key, value] of Object.entries(init.searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal });
    const body = (await res.json()) as T & GraphErrorBody;
    if (!res.ok || (body as GraphErrorBody).error) {
      const meta = sanitizeMetaErrorForLog(body);
      const message =
        (body as GraphErrorBody).error?.message ?? `Meta Graph request failed (${res.status}).`;
      const err = new Error(message);
      Object.assign(err, meta);
      throw err;
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeMetaDisplayPhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  const withPlus = digits.startsWith("+") ? digits : `+${digits.replace(/^\+/, "")}`;
  return isE164Phone(withPlus) ? withPlus : null;
}

export async function exchangeEmbeddedSignupCode(
  config: WhatsAppServerConfig,
  code: string,
  fetchImpl: GraphFetch = fetch,
): Promise<MetaAccessTokenResponse> {
  const searchParams: Record<string, string> = {
    client_id: config.appId,
    client_secret: config.appSecret,
    code,
  };
  if (config.redirectUri) {
    searchParams["redirect_uri"] = config.redirectUri;
  }

  const body = await graphRequest<{
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  }>(config, "/oauth/access_token", { method: "GET", searchParams }, fetchImpl);

  if (!body.access_token) {
    throw new Error("Meta token exchange did not return an access token.");
  }

  return {
    accessToken: body.access_token,
    tokenType: body.token_type ?? null,
    expiresIn: typeof body.expires_in === "number" ? body.expires_in : null,
  };
}

export async function debugWhatsAppToken(
  config: WhatsAppServerConfig,
  inputToken: string,
  fetchImpl: GraphFetch = fetch,
): Promise<MetaDebugTokenResult> {
  const appAccessToken = `${config.appId}|${config.appSecret}`;
  const body = await graphRequest<{
    data?: {
      is_valid?: boolean;
      expires_at?: number;
      granular_scopes?: Array<{ scope?: string; target_ids?: string[] }>;
    };
  }>(
    config,
    "/debug_token",
    {
      method: "GET",
      searchParams: {
        input_token: inputToken,
        access_token: appAccessToken,
      },
    },
    fetchImpl,
  );

  const scopes = body.data?.granular_scopes ?? [];
  const wabaIds = new Set<string>();
  const phoneNumberIds = new Set<string>();

  for (const scope of scopes) {
    const ids = scope.target_ids ?? [];
    if (scope.scope === "whatsapp_business_management") {
      ids.forEach((id) => wabaIds.add(id));
    }
    if (scope.scope === "whatsapp_business_messaging") {
      ids.forEach((id) => {
        if (/^\d+$/.test(id)) phoneNumberIds.add(id);
        else wabaIds.add(id);
      });
    }
  }

  return {
    wabaIds: [...wabaIds],
    phoneNumberIds: [...phoneNumberIds],
    expiresAt: typeof body.data?.expires_at === "number" ? body.data.expires_at : null,
    isValid: Boolean(body.data?.is_valid),
  };
}

export async function listWabaPhoneNumbers(
  config: WhatsAppServerConfig,
  wabaId: string,
  accessToken: string,
  fetchImpl: GraphFetch = fetch,
): Promise<MetaPhoneNumberDetails[]> {
  const body = await graphRequest<{
    data?: Array<{
      id?: string;
      display_phone_number?: string;
      verified_name?: string;
    }>;
  }>(
    config,
    `/${wabaId}/phone_numbers`,
    {
      method: "GET",
      searchParams: {
        access_token: accessToken,
        fields: "id,display_phone_number,verified_name",
      },
    },
    fetchImpl,
  );

  return (body.data ?? [])
    .filter((row) => typeof row.id === "string" && row.id.trim())
    .map((row) => ({
      phoneNumberId: row.id!.trim(),
      displayPhoneNumber: normalizeMetaDisplayPhone(row.display_phone_number ?? null),
      verifiedName: row.verified_name?.trim() || null,
    }));
}

export async function fetchPhoneNumberDetails(
  config: WhatsAppServerConfig,
  phoneNumberId: string,
  accessToken: string,
  fetchImpl: GraphFetch = fetch,
): Promise<MetaPhoneNumberDetails> {
  const body = await graphRequest<{
    id?: string;
    display_phone_number?: string;
    verified_name?: string;
  }>(
    config,
    `/${phoneNumberId}`,
    {
      method: "GET",
      searchParams: {
        access_token: accessToken,
        fields: "id,display_phone_number,verified_name",
      },
    },
    fetchImpl,
  );

  return {
    phoneNumberId,
    displayPhoneNumber: normalizeMetaDisplayPhone(body.display_phone_number ?? null),
    verifiedName: body.verified_name?.trim() || null,
  };
}

export type ResolvedWhatsAppAuthorization = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  accessToken: string;
  tokenExpiresAt: string | null;
};

export async function resolveAuthorizedWhatsAppResources(
  config: WhatsAppServerConfig,
  accessToken: string,
  tokenExpiresIn: number | null,
  sessionHints: { wabaId?: string | null; phoneNumberId?: string | null },
  fetchImpl: GraphFetch = fetch,
): Promise<ResolvedWhatsAppAuthorization> {
  const debug = await debugWhatsAppToken(config, accessToken, fetchImpl);
  if (!debug.isValid || debug.wabaIds.length === 0) {
    throw new Error("debug_token validation failed for WhatsApp authorization.");
  }

  let wabaId = debug.wabaIds[0]!;
  if (sessionHints.wabaId && debug.wabaIds.includes(sessionHints.wabaId)) {
    wabaId = sessionHints.wabaId;
  }

  let phoneNumberId = debug.phoneNumberIds[0] ?? null;
  if (!phoneNumberId) {
    const phones = await listWabaPhoneNumbers(config, wabaId, accessToken, fetchImpl);
    if (phones.length === 0) {
      throw new Error("No WhatsApp phone numbers found for authorized WABA.");
    }
    phoneNumberId = phones[0]!.phoneNumberId;
  }

  if (
    sessionHints.phoneNumberId &&
    (debug.phoneNumberIds.includes(sessionHints.phoneNumberId) ||
      sessionHints.phoneNumberId === phoneNumberId)
  ) {
    phoneNumberId = sessionHints.phoneNumberId;
  }

  const details = await fetchPhoneNumberDetails(config, phoneNumberId, accessToken, fetchImpl);

  const tokenExpiresAt =
    tokenExpiresIn != null
      ? new Date(Date.now() + tokenExpiresIn * 1000).toISOString()
      : debug.expiresAt != null
        ? new Date(debug.expiresAt * 1000).toISOString()
        : null;

  return {
    wabaId,
    phoneNumberId: details.phoneNumberId,
    displayPhoneNumber: details.displayPhoneNumber,
    verifiedName: details.verifiedName,
    accessToken,
    tokenExpiresAt,
  };
}
