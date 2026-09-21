/**
 * Release-gate read-only probes (no secrets printed).
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(join(root, ".env"));
loadEnv(join(root, ".env.local"));

function present(keys: string[]): "PRESENT" | "MISSING" {
  return keys.some((k) => Boolean(process.env[k]?.trim())) ? "PRESENT" : "MISSING";
}

const url = process.env["SUPABASE_URL"]?.trim() || process.env["VITE_SUPABASE_URL"]?.trim();
const key =
  process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim() ||
  process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"]?.trim();

if (!url || !key) {
  console.error("Missing SUPABASE_URL / SERVICE_ROLE for probes");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1) Duplicate owners
const owned = await admin
  .from("workspaces")
  .select("owner_user_id")
  .not("owner_user_id", "is", null);

if (owned.error) {
  console.error("duplicate-owners-query-failed", owned.error.message);
  process.exit(1);
}

const counts = new Map<string, number>();
for (const row of owned.data ?? []) {
  const id = String(row.owner_user_id);
  counts.set(id, (counts.get(id) ?? 0) + 1);
}
const duplicates = [...counts.entries()]
  .filter(([, n]) => n > 1)
  .map(([owner_user_id, count]) => ({ owner_user_id, count }))
  .sort((a, b) => b.count - a.count);

console.log("DUPLICATE_OWNERS_COUNT", duplicates.length);
console.log("DUPLICATE_OWNERS_JSON", JSON.stringify(duplicates));

// 2) last_whatsapp_contact_at presence via select probe
const colProbe = await admin
  .from("orders")
  .select("id, last_whatsapp_contact_at")
  .limit(1);
if (colProbe.error) {
  const missing = /last_whatsapp_contact_at|column|schema cache|does not exist/i.test(
    colProbe.error.message,
  );
  console.log("LAST_WHATSAPP_CONTACT", missing ? "MISSING" : `ERROR:${colProbe.error.message}`);
} else {
  console.log("LAST_WHATSAPP_CONTACT", "PASS");
}

// 3) Env presence only
console.log("ENV_SHOPIFY_API_KEY", present(["SHOPIFY_API_KEY"]));
console.log("ENV_SHOPIFY_API_SECRET", present(["SHOPIFY_API_SECRET"]));
console.log("ENV_SUPABASE_URL", present(["SUPABASE_URL", "VITE_SUPABASE_URL"]));
console.log(
  "ENV_SUPABASE_SERVICE_ROLE_KEY",
  present(["SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_SERVICE_ROLE_KEY"]),
);
console.log(
  "ENV_WHATSAPP_GATEWAY_URL",
  present(["WHATSAPP_GATEWAY_URL", "VITE_WHATSAPP_GATEWAY_URL"]),
);
console.log("ENV_GATEWAY_INTERNAL_SECRET", present(["GATEWAY_INTERNAL_SECRET"]));
console.log(
  "ENV_DROPEA_ENCRYPTION",
  present([
    "INTEGRATION_CREDENTIALS_ENCRYPTION_KEY",
    "WHATSAPP_TOKEN_ENCRYPTION_KEY",
  ]),
);
console.log(
  "ENV_PUBLIC_APP_URL",
  present(["PUBLIC_APP_URL", "VITE_PUBLIC_APP_URL", "APP_URL"]),
);
console.log(
  "ENV_ELEVATE_WEBHOOK_TOKEN_LEGACY",
  present(["ELEVATE_WEBHOOK_TOKEN"]),
);
