import { createServerClient } from "@supabase/ssr";
import {
  getCookies,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";

import type { Database } from "./types";
import { createSupabaseFetch, normalizeSupabaseEnv } from "./api-fetch";

/** Server Supabase client with cookie-backed PKCE session (SSR). */
export function createServerSupabase() {
  const SUPABASE_URL = normalizeSupabaseEnv(
    process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"],
  );
  const SUPABASE_PUBLISHABLE_KEY = normalizeSupabaseEnv(
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["SUPABASE_PUBLISHABLE_KEY"],
  );

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase URL or publishable key for SSR auth.");
  }

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    cookies: {
      getAll() {
        return Object.entries(getCookies()).map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(name, value, options);
        });
        if (headers) {
          Object.entries(headers).forEach(([name, value]) => {
            setResponseHeader(name, value);
          });
        }
      },
    },
  });
}
