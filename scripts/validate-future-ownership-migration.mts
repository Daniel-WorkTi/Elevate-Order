/**
 * Static validation for 20260920193000_future_ownership_check_not_valid.sql
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase/migrations/20260920193000_future_ownership_check_not_valid.sql"),
  "utf8",
);

const checks: { id: string; ok: boolean }[] = [];
function assert(id: string, ok: boolean) {
  checks.push({ id, ok });
}

assert("not-valid-orders", /orders_workspace_id_required_future[\s\S]*NOT VALID/.test(sql));
assert("not-valid-events", /order_events_workspace_id_required_future[\s\S]*NOT VALID/.test(sql));
assert("not-valid-shopify", /shopify_stores_workspace_id_required_future[\s\S]*NOT VALID/.test(sql));
assert("not-valid-workspaces", /workspaces_owner_user_id_required_future[\s\S]*NOT VALID/.test(sql));
// Strip SQL comments so prose like "until reconciliation" cannot false-positive.
const sqlNoComments = sql
  .replace(/--[^\n]*/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/'[^']*'/g, "''");
assert("no-validate", !/\bVALIDATE\s+CONSTRAINT\b/i.test(sqlNoComments));
assert("no-delete", !/\bDELETE\s+FROM\b/i.test(sqlNoComments));
assert("no-truncate", !/\bTRUNCATE\b/i.test(sqlNoComments));
assert("no-assign", !/\bUPDATE\b[\s\S]*\bworkspace_id\s*=/i.test(sqlNoComments));

for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"} ${c.id}`);
if (checks.some((c) => !c.ok)) process.exit(1);
console.log(`\nAll ${checks.length} checks passed.`);
