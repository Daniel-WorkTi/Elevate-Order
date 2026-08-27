import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AuthUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string | null;
};

function mapUser(user: {
  id: string;
  email?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const meta = user.user_metadata ?? {};
  const fullName =
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    null;
  const avatarUrl =
    (typeof meta["avatar_url"] === "string" && meta["avatar_url"]) ||
    (typeof meta["picture"] === "string" && meta["picture"]) ||
    null;

  return {
    id: user.id,
    email: user.email ?? null,
    fullName,
    avatarUrl,
    createdAt: user.created_at ?? null,
  };
}

/** Current user from cookie session (server). Null if signed out. */
export const getAuthUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthUser | null> => {
    const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");
    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return mapUser(data.user);
  },
);

const exchangeSchema = z.object({
  code: z.string().min(1),
});

/** Exchange OAuth PKCE code for a session (sets auth cookies). */
export const exchangeAuthCode = createServerFn({ method: "POST" })
  .validator((data: unknown) => exchangeSchema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");
    const supabase = createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(data.code);
    if (error) {
      console.error("[auth] exchangeCodeForSession failed");
      throw new Error("oauth_exchange_failed");
    }
    return { ok: true };
  });

export const signOutAuth = createServerFn({ method: "POST" }).handler(async () => {
  const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");
  const supabase = createServerSupabase();
  await supabase.auth.signOut();
  return { ok: true as const };
});

const startOAuthSchema = z.object({
  /** Browser origin (e.g. http://localhost:8080) — keeps local login off production. */
  origin: z.string().url().optional(),
});

async function startProviderOAuth(
  provider: "google",
  explicitOrigin?: string,
): Promise<{ url: string }> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");

  const request = getRequest();
  const redirectTo = `${resolveOAuthOrigin(request, explicitOrigin)}/auth/callback`;

  const supabase = createServerSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    console.error(`[auth] ${provider} oauth start failed`);
    throw new Error("oauth_start_failed");
  }

  return { url: data.url };
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

function originOf(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Rebuild origin from Host when the page request has no Origin (full navigation). */
function originFromHostHeader(request: Request): string | null {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  const hostname = host.split(":")[0] ?? host;
  // Never trust x-forwarded-* for loopback — local vite has Host: localhost:port.
  const localHost = request.headers.get("host");
  if (localHost) {
    const localName = localHost.split(":")[0] ?? localHost;
    if (isLoopbackHost(localName)) {
      return `http://${localHost}`;
    }
  }
  if (isLoopbackHost(hostname)) {
    return `http://${host}`;
  }
  const proto =
    request.headers.get("x-forwarded-proto") === "http" ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Prefer the browser origin so login on localhost never bounces to production
 * (PUBLIC_APP_URL / Site URL must not drive OAuth redirectTo).
 */
function resolveOAuthOrigin(request: Request, explicit?: string): string {
  const fromExplicit = originOf(explicit);
  const fromOrigin = originOf(request.headers.get("origin"));
  const fromReferer = originOf(request.headers.get("referer"));
  const fromHost = originFromHostHeader(request);
  const fromRequest = originOf(request.url);

  const hostHeader = request.headers.get("host");
  const hostName = hostHeader?.split(":")[0] ?? "";

  // Local vite / loopback: force local origin, ignore production PUBLIC_APP_URL noise.
  if (hostName && isLoopbackHost(hostName)) {
    const local =
      (fromExplicit && isLoopbackHost(new URL(fromExplicit).hostname) && fromExplicit) ||
      (fromOrigin && isLoopbackHost(new URL(fromOrigin).hostname) && fromOrigin) ||
      (fromReferer && isLoopbackHost(new URL(fromReferer).hostname) && fromReferer) ||
      fromHost ||
      `http://${hostHeader}`;
    return local;
  }

  const picked =
    fromExplicit || fromOrigin || fromReferer || fromHost || fromRequest;
  if (!picked) throw new Error("oauth_start_failed");
  return picked;
}

/** Build Google OAuth authorize URL on the server (PKCE cookies set here). */
export const startGoogleOAuth = createServerFn({ method: "GET" })
  .validator((data: unknown) => startOAuthSchema.parse(data ?? {}))
  .handler(async ({ data }) => startProviderOAuth("google", data.origin));

export function isPublicAuthPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/public/")
  );
}
