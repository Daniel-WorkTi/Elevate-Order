export function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/** Strip quotes/whitespace that Windows .env files sometimes keep. */
export function normalizeSupabaseEnv(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["']|["']$/g, "");
}

/**
 * New Supabase keys are opaque, not JWTs. Sending them as
 * `Authorization: Bearer sb_secret_...` makes PostgREST return PGRST303
 * ("JWT issued at future" / invalid JWT). Keep user session JWTs.
 */
export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  const key = normalizeSupabaseEnv(supabaseKey);

  return (input, init) => {
    const headers = new Headers(init?.headers);

    if (typeof Request !== "undefined" && input instanceof Request) {
      input.headers.forEach((value, headerName) => {
        if (!headers.has(headerName)) headers.set(headerName, value);
      });
    }

    const bearer = (headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (isNewSupabaseApiKey(bearer) || (isNewSupabaseApiKey(key) && bearer === key)) {
      headers.delete("Authorization");
    }

    headers.set("apikey", key);

    return fetch(new Request(input, { ...init, headers }));
  };
}
