/**
 * Static validation for 20260920190000_orders_workspace_scoped_identity.sql
 * — no DB apply.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(name: string): string {
  return readFileSync(join(root, "supabase/migrations", name), "utf8");
}

const migration = read("20260920190000_orders_workspace_scoped_identity.sql");
const foundation = read("20260810182503_9bdf9209-3fd3-47dc-83d8-22613008b507.sql");

type Check = { id: string; ok: boolean; detail?: string };
const checks: Check[] = [];

function assert(id: string, ok: boolean, detail?: string) {
  checks.push({ id, ok, detail });
}

assert("foundation-global-unique", /order_id bigint NOT NULL UNIQUE/.test(foundation));
assert("drops-orders-order-id-key", migration.includes("DROP CONSTRAINT IF EXISTS orders_order_id_key"));
assert(
  "adds-workspace-order-unique",
  migration.includes("orders_workspace_order_id_uidx") &&
    /\(workspace_id, order_id\)/.test(migration),
);
assert(
  "events-workspace-unique",
  migration.includes("order_events_workspace_order_event_uidx"),
);
assert("preflight-abort", migration.includes("P0 ABORTED"));
assert(
  "preflight-events-only-nonnull-status",
  migration.includes("event_dupes_blocking") &&
    migration.includes("status_id IS NOT NULL") &&
    migration.includes("null_status_dupes"),
);
assert("no-delete-orders", !/DELETE FROM public\.orders/i.test(migration));
assert("no-truncate", !/TRUNCATE/i.test(migration));
assert("no-auto-assign-workspace", !/UPDATE public\.orders[\s\S]*workspace_id\s*=/i.test(migration));

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"} ${c.id}${c.detail ? ` — ${c.detail}` : ""}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${checks.length} migration safety checks passed.`);
