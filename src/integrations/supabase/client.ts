import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { createSupabaseFetch, normalizeSupabaseEnv } from "./api-fetch";

function createSupabaseBrowserClient() {
  const SUPABASE_URL = normalizeSupabaseEnv(
    import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"],
  );
  const SUPABASE_PUBLISHABLE_KEY = normalizeSupabaseEnv(
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
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

  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    isSingleton: true,
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: import.meta.env.PROD,
    },
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseBrowserClient> | undefined;

/** Browser Supabase client (PKCE + cookie session via @supabase/ssr). */
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseBrowserClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseBrowserClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
