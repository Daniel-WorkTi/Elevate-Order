/**
 * Static validation for 20260828250000_whatsapp_cod_confirmation.sql
 * against the existing migration chain — no DB apply.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(name: string): string {
  return readFileSync(join(root, "supabase/migrations", name), "utf8");
}

const foundation = read("20260827200000_whatsapp_foundation.sql");
const multitenant = read("20260827190000_workspaces_multitenant.sql");
const inbound = read("20260828230000_whatsapp_inbound_inbox.sql");
const migration = read("20260828250000_whatsapp_cod_confirmation.sql");
const grants = read("20260828250100_whatsapp_cod_confirmation_grants.sql");

type Check = { id: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function assert(id: string, ok: boolean, detail?: string) {
  checks.push({ id, ok, detail });
}

// Prerequisites from prior migrations
assert("A-prereq", foundation.includes("whatsapp_conversations_id_workspace_uidx"));
assert("A-prereq", foundation.includes("orders_id_workspace_uidx"));
assert("B-prereq", multitenant.includes("CREATE TABLE IF NOT EXISTS public.workspaces"));
assert("C-prereq", inbound.includes("upsert_whatsapp_inbound_message"));

// 1 — do NOT mutate supply snapshots
assert(
  "A-no-status-mutation",
  !/UPDATE public\.orders[\s\S]*status_name\s*=/.test(migration),
  "RPC must not assign status_name",
);
assert(
  "A-no-details-mutation",
  !/UPDATE public\.orders[\s\S]*details\s*=/.test(migration),
  "RPC must not assign details",
);

// 2 — external status v1
assert(
  "M-external-not-applicable-only",
  migration.includes("CHECK (external_confirmation_status = 'not_applicable')"),
);
assert(
  "M-no-pending-assignment",
  !migration.includes("'pending'") && !/external_confirmation_status\s*=\s*'pending'/.test(migration),
);

// 3 — compound FK tenant safety
assert(
  "G-messages-id-workspace-uidx",
  migration.includes("whatsapp_messages_id_workspace_uidx"),
  "Required for compound FK to whatsapp_messages",
);
assert(
  "G-compound-message-fk",
  /orders_confirmation_message_workspace_fkey[\s\S]*whatsapp_messages \(id, workspace_id\)/.test(
    migration,
  ),
);
assert(
  "G-compound-conversation-fk",
  /orders_confirmation_conversation_workspace_fkey[\s\S]*whatsapp_conversations \(id, workspace_id\)/.test(
    migration,
  ),
);
assert(
  "G-events-compound-fks",
  migration.includes("order_confirmation_events_message_workspace_fkey")
    && migration.includes("order_confirmation_events_conversation_workspace_fkey"),
);

// 4 — RPC validation strings
assert("I-whatsapp-auto-evidence", migration.includes("whatsapp_auto_requires_inbound_evidence"));
assert("I-inbound-direction", migration.includes("whatsapp_auto_requires_inbound_message"));
assert("J-operator-actor", migration.includes("operator_requires_actor"));
assert("P-operator-workspace-auth", migration.includes("operator_not_authorized_for_workspace"));
assert(
  "P-operator-owner-check",
  /confirm_order_cod[\s\S]*w\.owner_user_id = p_actor_user_id/.test(migration),
);
assert("N-classification-inbound", migration.includes("classification_requires_inbound_message"));
assert(
  "N-classification-inbound-guard",
  /record_confirmation_classification[\s\S]*v_msg\.direction <> 'inbound'/.test(migration),
);
assert(
  "O-shipped-eligibility",
  migration.includes("shipp|enviad|despach"),
);
assert("F-workspace-order", migration.includes("order_not_found"));
assert("G-conversation-mismatch", migration.includes("conversation_order_mismatch"));
assert("G-message-conversation", migration.includes("message_conversation_mismatch"));

// 5 — idempotency
assert("H-advisory-lock", migration.includes("pg_advisory_xact_lock"));
assert("H-confirmed-at-gate", migration.includes("confirmed_at IS NOT NULL"));
assert("H-one-confirm-uidx", migration.includes("order_confirmation_events_one_confirm_uidx"));

// 6 — classification without order
assert(
  "K-classification-nullable-order",
  /order_uuid uuid,?/.test(migration) && migration.includes("p_order_uuid uuid DEFAULT NULL"),
);
assert(
  "K-order-required-for-confirm-event",
  migration.includes("order_confirmation_events_order_required_chk"),
);

// 7 — no inbound text duplication
assert(
  "privacy-no-inbound-preview",
  !migration.includes("inbound_text_preview"),
);

// 8 — no fake whatsapp system message type (allow 'system' as event source enum)
assert(
  "timeline-no-system-message-type",
  !/message_type[\s\S]*'system'/.test(migration)
    && !migration.includes("ADD CONSTRAINT whatsapp_messages_message_type_check"),
);

// 9 — toggle default off
assert(
  "C-auto-confirm-default-false",
  migration.includes("whatsapp_auto_confirm boolean NOT NULL DEFAULT false"),
);

// 10 — permissions
assert(
  "D-revoke-public-confirm",
  migration.includes("REVOKE ALL ON FUNCTION public.confirm_order_cod") ||
    grants.includes("REVOKE ALL ON FUNCTION public.confirm_order_cod"),
);
assert(
  "D-revoke-authenticated-confirm",
  migration.includes("FROM PUBLIC, anon, authenticated") ||
    grants.includes("FROM PUBLIC, anon, authenticated"),
);
assert(
  "E-grant-service-role-confirm",
  migration.includes("GRANT EXECUTE ON FUNCTION public.confirm_order_cod") ||
    grants.includes("GRANT EXECUTE ON FUNCTION public.confirm_order_cod"),
);
assert(
  "D-revoke-public-classify",
  migration.includes("REVOKE ALL ON FUNCTION public.record_confirmation_classification") ||
    grants.includes("REVOKE ALL ON FUNCTION public.record_confirmation_classification"),
);

// L — no external API references
assert(
  "L-no-dropi-api",
  !/dropi|dropea|shopify/i.test(migration.replace(/external_confirmation_status/g, "")),
);

const failed = checks.filter((c) => !c.ok);
console.log(`Phase 6 migration static validation: ${checks.length - failed.length}/${checks.length} passed\n`);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.id}${c.detail ? ` — ${c.detail}` : ""}`);
}
if (failed.length > 0) process.exit(1);
