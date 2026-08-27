import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const k = t.slice(0, eq);
    let v = t.slice(eq + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const admin = createClient(url, key, { auth: { persistSession: false } });

const emails = [
  "phase0-test-user-a@elevate-phase0.test",
  "phase0-test-user-b@elevate-phase0.test",
];

const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
const found = (users?.users || []).filter((u) => emails.includes(u.email || ""));

const { data: ws } = await admin
  .from("workspaces")
  .select("id, name")
  .in("name", ["phase0-test-workspace-a", "phase0-test-workspace-b"]);

const { count: orders } = await admin
  .from("orders")
  .select("order_id", { count: "exact", head: true })
  .eq("source", "phase0-test");

const { count: events } = await admin
  .from("order_events")
  .select("id", { count: "exact", head: true })
  .eq("source", "phase0-test");

const { count: tpl } = await admin
  .from("message_templates")
  .select("id", { count: "exact", head: true })
  .ilike("description", "%phase0-test%");

console.log(
  JSON.stringify(
    {
      testUsersRemaining: found.length,
      testWorkspacesRemaining: ws?.length ?? 0,
      phase0OrdersRemaining: orders ?? 0,
      phase0EventsRemaining: events ?? 0,
      phase0TemplatesRemaining: tpl ?? 0,
      allClear:
        found.length === 0 &&
        (ws?.length ?? 0) === 0 &&
        (orders ?? 0) === 0 &&
        (events ?? 0) === 0 &&
        (tpl ?? 0) === 0,
    },
    null,
    2,
  ),
);
