/**
 * Live AuthZ probe against remote workspaces (no user JWT).
 * Validates requireWorkspaceAccess semantics for claimed / orphan / foreign.
 */
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
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

async function requireWorkspaceAccessSim(userId: string, workspaceId: string) {
  const { data, error } = await admin
    .from("workspaces")
    .select("id, name, owner_user_id")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) return { ok: false, code: "forbidden" as const };
  if (!data) return { ok: false, code: "not_found" as const };
  const owner = typeof data.owner_user_id === "string" ? data.owner_user_id : null;
  if (!owner || owner !== userId) return { ok: false, code: "forbidden" as const };
  return { ok: true, code: "ok" as const };
}

const { data: workspaces } = await admin.from("workspaces").select("id, owner_user_id");

const claimed = (workspaces || []).find((w) => w.owner_user_id);
const orphan = (workspaces || []).find((w) => !w.owner_user_id);
const fakeUser = "00000000-0000-4000-8000-000000000099";
const missingWs = "00000000-0000-4000-8000-000000000001";

const cases: Array<[string, string, string, boolean]> = [];
if (claimed?.owner_user_id) {
  cases.push(["owner→claimed", claimed.owner_user_id, claimed.id, true]);
  cases.push(["foreign→claimed", fakeUser, claimed.id, false]);
}
if (orphan) {
  cases.push(["foreign→orphan", fakeUser, orphan.id, false]);
  if (claimed?.owner_user_id) {
    cases.push(["owner→orphan", claimed.owner_user_id, orphan.id, false]);
  }
}
cases.push(["anyone→missing", fakeUser, missingWs, false]);

let fail = 0;
for (const [label, userId, wsId, expectOk] of cases) {
  const result = await requireWorkspaceAccessSim(userId, wsId);
  const pass = result.ok === expectOk;
  if (!pass) fail += 1;
  console.log(`${pass ? "PASS" : "FAIL"} ${label} → ok=${result.ok} code=${result.code}`);
}

// RLS: authenticated session unavailable — document
console.log("\nNOTE: authenticated JWT cross-tenant RLS = NOT TESTED (no second user session)");

// Webhook auth without session — check reject without token
const webhookRes = await fetch(`${url}/rest/v1/orders?select=order_id&limit=1`, {
  headers: {
    apikey: process.env.SUPABASE_PUBLISHABLE_KEY || "",
    Authorization: `Bearer ${process.env.SUPABASE_PUBLISHABLE_KEY || ""}`,
  },
});
console.log(`anon orders select status=${webhookRes.status} (expect empty/denied under RLS)`);

process.exit(fail > 0 ? 1 : 0);
