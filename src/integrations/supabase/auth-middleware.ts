import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { JwtPayload } from "@supabase/supabase-js";
import type { Database } from "./types";
import { createSupabaseFetch, normalizeSupabaseEnv } from "./api-fetch";

type AuthFnContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims: JwtPayload | null;
};

/**
 * Server-function auth boundary.
 * Accepts either:
 * - Authorization: Bearer <access_token> (from attachSupabaseAuth on the client), or
 * - Cookie session via createServerSupabase (SSR / PKCE OAuth).
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = normalizeSupabaseEnv(process.env["SUPABASE_URL"]);
    const SUPABASE_PUBLISHABLE_KEY = normalizeSupabaseEnv(
      process.env["SUPABASE_PUBLISHABLE_KEY"],
    );

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Connect Supabase in Lovable Cloud.`;
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }

    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");

    let context: AuthFnContext;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      if (!token || token.split(".").length !== 3) {
        throw new Error("Unauthorized: Invalid token");
      }

      const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: { Authorization: `Bearer ${token}` },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims?.sub) {
        throw new Error("Unauthorized: Invalid token");
      }

      context = {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      };
    } else {
      // SSR / cookie session (PKCE OAuth)
      const { createServerSupabase } = await import("./ssr.server");
      const supabase = createServerSupabase();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        throw new Error("Unauthorized: No session");
      }

      context = {
        supabase,
        userId: data.user.id,
        claims: null,
      };
    }

    return next({ context });
  },
);
