import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AuthUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

function mapUser(user: {
  id: string;
  email?: string | null;
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

async function startProviderOAuth(provider: "google"): Promise<{ url: string }> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { createServerSupabase } = await import("@/integrations/supabase/ssr.server");

  const request = getRequest();
  const redirectTo = `${resolveRequestOrigin(request)}/auth/callback`;

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

/** Prefer the browser Origin so login on localhost does not bounce to production. */
function resolveRequestOrigin(request: Request): string {
  const fromOrigin = originOf(request.headers.get("origin"));
  if (fromOrigin) return fromOrigin;
  const fromReferer = originOf(request.headers.get("referer"));
  if (fromReferer) return fromReferer;
  const fromRequest = originOf(request.url);
  if (fromRequest) return fromRequest;
  throw new Error("oauth_start_failed");
}

function originOf(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/** Build Google OAuth authorize URL on the server (PKCE cookies set here). */
export const startGoogleOAuth = createServerFn({ method: "GET" }).handler(async () =>
  startProviderOAuth("google"),
);

export function isPublicAuthPath(pathname: string) {
  return (
    pathname === "/login" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/public/")
  );
}
