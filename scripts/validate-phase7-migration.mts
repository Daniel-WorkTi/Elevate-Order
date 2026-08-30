/**
 * Static validation for 20260828270000_cod_operation_handled.sql
 * against Phase 6 panel + domain rules — no DB apply.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DROPI_SOURCE_INDEX_PREDICATE } from "../src/lib/orders/cod-operation.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(name: string): string {
  return readFileSync(join(root, "supabase/migrations", name), "utf8");
}

const phase6Panel = read("20260828260000_cod_confirmation_panel.sql");
const phase6Cod = read("20260828250000_whatsapp_cod_confirmation.sql");
const migration = read("20260828270000_cod_operation_handled.sql");

type Check = { id: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function assert(id: string, ok: boolean, detail?: string) {
  checks.push({ id, ok, detail });
}

// 6 — Phase 6 panel prerequisites
assert("6-panel-cod-reply-intent", phase6Panel.includes("cod_reply_intent"));
assert("6-panel-cod-reply-at", phase6Panel.includes("cod_reply_at"));
assert("6-panel-check-values", phase6Panel.includes("'confirm'") && phase6Panel.includes("'reject'"));

// 6 — Phase 7 dependency gate in migration
assert("6-gate-cod-reply-intent", migration.includes("cod_reply_intent"));
assert("6-gate-cod-reply-at", migration.includes("cod_reply_at"));
assert("6-gate-exception", migration.includes("phase6_cod_confirmation_panel_required"));

// 1 — order required for handled + confirmed
assert(
  "1-order-required-handled",
  /event_type NOT IN \('order_confirmed', 'cod_operation_handled'\)/.test(migration),
);
assert(
  "1-handled-operator-check",
  migration.includes("order_confirmation_events_handled_operator_chk"),
);

// 2 — cache repair
assert("2-cache-repair", migration.includes("cod_handled_at = v_existing_at"));
assert("2-no-double-insert", (migration.match(/INSERT INTO public\.order_confirmation_events/g) ?? []).length === 1);

// 3 — Dropi index
assert("3-dropi-index", migration.includes("idx_orders_cod_dropi_pending"));
assert("3-index-predicate", migration.includes(DROPI_SOURCE_INDEX_PREDICATE));

// 4 — single timestamp
assert("4-v-handled-at", migration.includes("v_handled_at := now()"));
assert("4-cache-same-ts", migration.includes("cod_handled_at = v_handled_at"));

// 5 — tenant-safe backfill
assert("5-backfill-workspace", migration.includes("o.workspace_id = e.workspace_id"));

// 7 — no fake confirmation
assert("7-no-confirmed-at", !/UPDATE public\.orders[\s\S]*confirmed_at\s*=/.test(migration));
assert("7-no-status-name", !/UPDATE public\.orders[\s\S]*status_name\s*=/.test(migration));
assert("7-no-external-sync", !/external_confirmation_status\s*=/.test(migration));

// 8 — concurrency
assert("8-for-update", migration.includes("FOR UPDATE"));
assert("8-unique-handled", migration.includes("order_confirmation_events_one_handled_uidx"));

const failed = checks.filter((c) => !c.ok);
if (failed.length > 0) {
  console.error("Phase 7 migration validation FAILED:");
  for (const f of failed) {
    console.error(`  [${f.id}] ${f.detail ?? "check failed"}`);
  }
  process.exit(1);
}

console.log(`Phase 7 migration validation OK (${checks.length} checks)`);
