/**
 * Static validation for 20260828190000_whatsapp_web_provider.sql
 * against 20260827200000_whatsapp_foundation.sql — no DB apply.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const foundation = readFileSync(
  join(root, "supabase/migrations/20260827200000_whatsapp_foundation.sql"),
  "utf8",
);
const migration = readFileSync(
  join(root, "supabase/migrations/20260828190000_whatsapp_web_provider.sql"),
  "utf8",
);

const checks: { name: string; ok: boolean; detail?: string }[] = [];

function assert(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
}

// Required foundation objects
const foundationObjects = [
  "whatsapp_connections",
  "whatsapp_connection_secrets",
  "whatsapp_messages",
  "whatsapp_conversations",
  "touch_updated_at",
  "workspaces",
  "orders_id_workspace_uidx",
  "whatsapp_connections_id_workspace_uidx",
  "whatsapp_messages_whatsapp_message_id_uidx",
  "whatsapp_connections_phone_active_uidx",
  "CHECK (status IN ('pending', 'connected', 'disconnected', 'error')",
];

for (const obj of foundationObjects) {
  assert(`foundation defines ${obj}`, foundation.includes(obj));
}

// Migration must NOT default provider to whatsapp_web before backfill
const providerAddIdx = migration.indexOf("ADD COLUMN IF NOT EXISTS provider");
const firstDefaultIdx = migration.indexOf("SET DEFAULT 'whatsapp_web'");
const backfillIdx = migration.indexOf("SET provider = 'meta_cloud'");
assert(
  "provider backfill runs before DEFAULT whatsapp_web",
  backfillIdx !== -1 && firstDefaultIdx !== -1 && backfillIdx < firstDefaultIdx,
);
assert(
  "provider column added without immediate DEFAULT",
  !/ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT/.test(migration),
);

// No global unique on display_phone for web
assert(
  "no UNIQUE index on display_phone_number",
  !/^CREATE UNIQUE INDEX[^\n]*display_phone_number/im.test(migration),
);
assert(
  "lookup index on display_phone_number exists",
  migration.includes("idx_whatsapp_connections_web_display_phone_lookup"),
);

// Cascade chain
assert("sessions CASCADE on connection_id", migration.includes("ON DELETE CASCADE"));
assert(
  "session_keys CASCADE on session_id",
  /whatsapp_session_keys[\s\S]*ON DELETE CASCADE/.test(migration),
);
assert(
  "workspace_id on sessions stays RESTRICT",
  /workspace_id uuid NOT NULL[\s\S]*REFERENCES public\.workspaces[\s\S]*ON DELETE RESTRICT/.test(
    migration,
  ),
);

// Idempotency index
assert(
  "composite unique (connection_id, whatsapp_message_id)",
  migration.includes("whatsapp_messages_connection_external_id_uidx"),
);

// Safe classification guard
assert(
  "fail-closed unclassified rows check",
  migration.includes("unclassified rows remain after meta_cloud backfill"),
);

// Forbidden patterns
assert(
  "no encrypted_session single blob column",
  !migration.includes("encrypted_session"),
);
assert(
  "no active column on sessions",
  !/whatsapp_sessions[\s\S]*\bactive\b/.test(migration),
);

const failed = checks.filter((c) => !c.ok);
console.log(`Static validation: ${checks.length - failed.length}/${checks.length} passed`);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}
if (failed.length > 0) process.exit(1);
