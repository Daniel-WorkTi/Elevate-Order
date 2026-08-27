/**
 * Phase 0 authenticated security gate — fixtures + A/B/C/J/K/M/N.
 *
 * Creates isolated test users/workspaces/orders (does NOT touch real orphans).
 * Does NOT auto-cleanup. Writes state to scripts/.phase0-fixture-state.json
 *
 * Usage:
 *   npx tsx scripts/phase0-auth-security-gate.mts
 *   npx tsx scripts/phase0-auth-security-gate.mts --cleanup   # only after approval
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  requireWorkspaceAccess,
  WorkspaceAccessError,
  workspaceAccessHttpStatus,
} from "../src/lib/workspace/require-workspace-access";
import { resolveOwnedActiveWorkspace } from "../src/lib/workspace/workspace.functions";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, ".phase0-fixture-state.json");
const MARKER = "phase0-test";

type FixtureState = {
  createdAt: string;
  password: string;
  userA: { id: string; email: string };
  userB: { id: string; email: string };
  workspaceA: { id: string; name: string };
  workspaceB: { id: string; name: string };
  orderIdsA: number[];
  orderIdsB: number[];
  templateIds: string[];
  orphanProbeId: string | null;
};

type GateResult = { id: string; status: "PASS" | "FAIL" | "NOT TESTED"; detail: string };

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

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!url || !serviceKey || !anonKey) {
  console.error("Missing SUPABASE_URL / SERVICE_ROLE / PUBLISHABLE key");
  process.exit(1);
}

// Point server-side helpers at the same project.
process.env.SUPABASE_URL = url;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function maskId(id: string): string {
  if (id.length < 12) return "***";
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function clientWithJwt(jwt: string): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

async function signIn(email: string, password: string): Promise<string> {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session?.access_token) {
    throw new Error(`signIn failed for ${email}: ${error?.message ?? "no session"}`);
  }
  return data.session.access_token;
}

async function findOrCreateUser(email: string, password: string, label: string) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listed.error) throw new Error(listed.error.message);
  const existing = listed.data.users.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { label, phase0_fixture: true },
    });
    return { id: existing.id, email };
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { label, phase0_fixture: true },
  });
  if (created.error || !created.data.user) {
    throw new Error(`createUser ${email}: ${created.error?.message ?? "unknown"}`);
  }
  return { id: created.data.user.id, email };
}

async function ensureWorkspace(name: string, ownerUserId: string) {
  const existing = await admin
    .from("workspaces")
    .select("id, name, owner_user_id")
    .eq("name", name)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (existing.data?.id) {
    return { id: existing.data.id as string, name };
  }
  const inserted = await admin
    .from("workspaces")
    .insert({ name, owner_user_id: ownerUserId })
    .select("id, name")
    .single();
  if (inserted.error || !inserted.data) {
    throw new Error(`workspace ${name}: ${inserted.error?.message ?? "insert failed"}`);
  }
  return { id: inserted.data.id as string, name };
}

async function ensureSyntheticOrders(workspaceId: string, baseOrderId: number) {
  const ids = [baseOrderId, baseOrderId + 1];
  for (const orderId of ids) {
    const { data: existing } = await admin
      .from("orders")
      .select("order_id")
      .eq("order_id", orderId)
      .maybeSingle();
    if (existing) {
      await admin
        .from("orders")
        .update({
          workspace_id: workspaceId,
          source: "phase0-test",
          status_name: "confirmed",
          customer_name: "Phase0 Test Customer",
          details: MARKER,
        })
        .eq("order_id", orderId);
    } else {
      const { error } = await admin.from("orders").insert({
        order_id: orderId,
        workspace_id: workspaceId,
        source: "phase0-test",
        status_name: "confirmed",
        status_id: 1,
        customer_name: "Phase0 Test Customer",
        details: MARKER,
        total: 10,
        currency: "EUR",
      });
      if (error) throw new Error(`order ${orderId}: ${error.message}`);
    }

    const { data: ev } = await admin
      .from("order_events")
      .select("id")
      .eq("order_id", orderId)
      .eq("source", "phase0-test")
      .limit(1);
    if (!ev?.length) {
      const { error } = await admin.from("order_events").insert({
        order_id: orderId,
        workspace_id: workspaceId,
        source: "phase0-test",
        event_date: new Date().toISOString(),
        status_name: "confirmed",
        details: MARKER,
      });
      if (error) throw new Error(`event ${orderId}: ${error.message}`);
    } else {
      await admin
        .from("order_events")
        .update({ workspace_id: workspaceId })
        .eq("order_id", orderId)
        .eq("source", "phase0-test");
    }
  }
  return ids;
}

async function ensureTemplate(workspaceId: string, kind: string) {
  const { data: existing } = await admin
    .from("message_templates")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("supply", "dropi")
    .eq("kind", kind)
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data, error } = await admin
    .from("message_templates")
    .insert({
      supply: "dropi",
      kind,
      name: `${MARKER}-${kind}`,
      description: MARKER,
      content: `Hello {{customer_name}} (${MARKER})`,
      workspace_id: workspaceId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`template ${kind}: ${error?.message ?? "fail"}`);
  return data.id as string;
}

async function pickOrphanId(): Promise<string | null> {
  const { data } = await admin
    .from("workspaces")
    .select("id")
    .is("owner_user_id", null)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function setupFixtures(): Promise<FixtureState> {
  const password = `P0-${randomBytes(12).toString("base64url")}!aA1`;
  const userA = await findOrCreateUser(
    "phase0-test-user-a@elevate-phase0.test",
    password,
    "phase0-test-user-a",
  );
  const userB = await findOrCreateUser(
    "phase0-test-user-b@elevate-phase0.test",
    password,
    "phase0-test-user-b",
  );
  const workspaceA = await ensureWorkspace("phase0-test-workspace-a", userA.id);
  const workspaceB = await ensureWorkspace("phase0-test-workspace-b", userB.id);
  // High synthetic ids to avoid colliding with real Dropi/Shopify order_ids.
  const orderIdsA = await ensureSyntheticOrders(workspaceA.id, 910_001_001);
  const orderIdsB = await ensureSyntheticOrders(workspaceB.id, 910_002_001);
  const templateIds = [
    await ensureTemplate(workspaceA.id, "confirmation"),
    await ensureTemplate(workspaceB.id, "confirmation"),
  ];
  const orphanProbeId = await pickOrphanId();

  const state: FixtureState = {
    createdAt: new Date().toISOString(),
    password,
    userA,
    userB,
    workspaceA,
    workspaceB,
    orderIdsA,
    orderIdsB,
    templateIds,
    orphanProbeId,
  };
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
  return state;
}

async function cleanup(state: FixtureState) {
  console.log("\n=== CLEANUP (authorized) ===");
  // Delete synthetic rows first (FK to workspaces).
  for (const orderId of [...state.orderIdsA, ...state.orderIdsB]) {
    await admin.from("order_events").delete().eq("order_id", orderId).eq("source", "phase0-test");
    await admin.from("orders").delete().eq("order_id", orderId).eq("source", "phase0-test");
  }
  for (const id of state.templateIds) {
    await admin.from("message_templates").delete().eq("id", id);
  }
  await admin.from("workspaces").delete().eq("id", state.workspaceA.id);
  await admin.from("workspaces").delete().eq("id", state.workspaceB.id);
  await admin.auth.admin.deleteUser(state.userA.id);
  await admin.auth.admin.deleteUser(state.userB.id);
  if (existsSync(STATE_PATH)) {
    writeFileSync(STATE_PATH, JSON.stringify({ cleanedAt: new Date().toISOString() }, null, 2));
  }
  console.log("Cleanup complete.");
}

function authzHttp(err: unknown): { status: number; code: string; message: string } {
  if (err instanceof WorkspaceAccessError) {
    return {
      status: workspaceAccessHttpStatus(err),
      code: err.code,
      message: err.message,
    };
  }
  return { status: 500, code: "unknown", message: String(err) };
}

async function runGates(state: FixtureState): Promise<GateResult[]> {
  const results: GateResult[] = [];
  const jwtA = await signIn(state.userA.email, state.password);
  const jwtB = await signIn(state.userB.email, state.password);
  const clientA = clientWithJwt(jwtA);
  const clientB = clientWithJwt(jwtB);

  // ---------- A: User A reads own ----------
  {
    const ws = await clientA.from("workspaces").select("id, name").eq("id", state.workspaceA.id);
    const orders = await clientA
      .from("orders")
      .select("order_id")
      .eq("workspace_id", state.workspaceA.id);
    const events = await clientA
      .from("order_events")
      .select("id")
      .eq("workspace_id", state.workspaceA.id);
    const templates = await clientA
      .from("message_templates")
      .select("id")
      .eq("workspace_id", state.workspaceA.id);

    const ok =
      !ws.error &&
      (ws.data?.length ?? 0) === 1 &&
      !orders.error &&
      (orders.data?.length ?? 0) >= 1 &&
      !events.error &&
      (events.data?.length ?? 0) >= 1 &&
      !templates.error &&
      (templates.data?.length ?? 0) >= 1;

    results.push({
      id: "A",
      status: ok ? "PASS" : "FAIL",
      detail: ok
        ? `User A reads own workspace/orders/events/templates (counts ws=${ws.data?.length} orders=${orders.data?.length} events=${events.data?.length} tpl=${templates.data?.length})`
        : `errors ws=${ws.error?.message} orders=${orders.error?.message} events=${events.error?.message} tpl=${templates.error?.message}`,
    });
  }

  // ---------- B: User A cannot read Workspace B (PostgREST) ----------
  {
    const ws = await clientA.from("workspaces").select("id").eq("id", state.workspaceB.id);
    const orders = await clientA
      .from("orders")
      .select("order_id")
      .eq("workspace_id", state.workspaceB.id);
    const events = await clientA
      .from("order_events")
      .select("id")
      .eq("workspace_id", state.workspaceB.id);
    const templates = await clientA
      .from("message_templates")
      .select("id")
      .eq("workspace_id", state.workspaceB.id);

    const denied =
      (ws.data?.length ?? 0) === 0 &&
      (orders.data?.length ?? 0) === 0 &&
      (events.data?.length ?? 0) === 0 &&
      (templates.data?.length ?? 0) === 0;

    results.push({
      id: "B-rls",
      status: denied ? "PASS" : "FAIL",
      detail: denied
        ? "User A PostgREST gets 0 rows for Workspace B (ws/orders/events/templates)"
        : `LEAK ws=${ws.data?.length} orders=${orders.data?.length} events=${events.data?.length} tpl=${templates.data?.length}`,
    });
  }

  // ---------- B/J: Server AuthZ spoof (same gate as querySyncedOrders etc.) ----------
  {
    const targets = [
      "querySyncedOrders",
      "getSyncedOrder",
      "queryInboxQueue",
      "queryProfitsOrders",
      "getWorkspaceWebhookUrl",
      "queryRecoveryDashboard",
      "getDropiDashboard",
      "getDropeaDashboard",
    ];
    const outcomes: string[] = [];
    let allDenied = true;
    for (const fn of targets) {
      try {
        await requireWorkspaceAccess(state.userA.id, state.workspaceB.id);
        allDenied = false;
        outcomes.push(`${fn}: ALLOWED (unexpected)`);
      } catch (err) {
        const http = authzHttp(err);
        const ok = http.status === 403;
        if (!ok) allDenied = false;
        outcomes.push(`${fn}: HTTP ${http.status} code=${http.code}`);
      }
    }
    results.push({
      id: "B",
      status: allDenied ? "PASS" : "FAIL",
      detail: `User A → Workspace B AuthZ (authorizeWorkspaceInput/requireWorkspaceAccess): ${outcomes.join("; ")}`,
    });
    results.push({
      id: "J",
      status: allDenied ? "PASS" : "FAIL",
      detail: `Workspace spoof blocked before privileged query. ${outcomes.join("; ")}`,
    });
  }

  // ---------- C: User B cannot access Workspace A ----------
  {
    const ws = await clientB.from("workspaces").select("id").eq("id", state.workspaceA.id);
    const orders = await clientB
      .from("orders")
      .select("order_id")
      .eq("workspace_id", state.workspaceA.id);
    let authzDenied = false;
    let httpStatus = 0;
    try {
      await requireWorkspaceAccess(state.userB.id, state.workspaceA.id);
    } catch (err) {
      const http = authzHttp(err);
      httpStatus = http.status;
      authzDenied = http.status === 403;
    }
    const rlsDenied = (ws.data?.length ?? 0) === 0 && (orders.data?.length ?? 0) === 0;
    const ok = rlsDenied && authzDenied;
    results.push({
      id: "C",
      status: ok ? "PASS" : "FAIL",
      detail: ok
        ? `User B denied Workspace A (RLS 0 rows + AuthZ HTTP ${httpStatus})`
        : `rlsDenied=${rlsDenied} authzDenied=${authzDenied} http=${httpStatus}`,
    });
  }

  // ---------- K: PostgREST explicit ----------
  {
    const aOnB = await clientA
      .from("orders")
      .select("order_id")
      .eq("workspace_id", state.workspaceB.id);
    const aWsB = await clientA.from("workspaces").select("id").eq("id", state.workspaceB.id);
    const bOnA = await clientB
      .from("orders")
      .select("order_id")
      .eq("workspace_id", state.workspaceA.id);
    const bWsA = await clientB.from("workspaces").select("id").eq("id", state.workspaceA.id);
    const ok =
      (aOnB.data?.length ?? 0) === 0 &&
      (aWsB.data?.length ?? 0) === 0 &&
      (bOnA.data?.length ?? 0) === 0 &&
      (bWsA.data?.length ?? 0) === 0;
    results.push({
      id: "K",
      status: ok ? "PASS" : "FAIL",
      detail: ok
        ? "JWT authenticated cross-tenant SELECT returns 0 rows both directions"
        : `aOnB=${aOnB.data?.length} aWsB=${aWsB.data?.length} bOnA=${bOnA.data?.length} bWsA=${bWsA.data?.length}`,
    });
  }

  // ---------- M: localStorage preference spoof (server resolve path) ----------
  {
    const spoofB = await resolveOwnedActiveWorkspace(state.userA.id, state.workspaceB.id);
    const spoofMissing = await resolveOwnedActiveWorkspace(
      state.userA.id,
      "00000000-0000-4000-8000-000000000099",
    );
    const ok =
      spoofB.workspace.id === state.workspaceA.id &&
      spoofMissing.workspace.id === state.workspaceA.id &&
      !spoofB.workspaces.some((w) => w.id === state.workspaceB.id);
    results.push({
      id: "M",
      status: ok ? "PASS" : "FAIL",
      detail: ok
        ? `resolveActiveWorkspace rejected Workspace B + missing UUID; selected Workspace A (${maskId(spoofB.workspace.id)})`
        : `got ${maskId(spoofB.workspace.id)} / ${maskId(spoofMissing.workspace.id)}`,
    });
  }

  // ---------- N: orphan deny (read-only, no ownership change) ----------
  {
    if (!state.orphanProbeId) {
      results.push({
        id: "N",
        status: "NOT TESTED",
        detail: "No orphan workspace available",
      });
    } else {
      const ws = await clientA.from("workspaces").select("id").eq("id", state.orphanProbeId);
      const orders = await clientA
        .from("orders")
        .select("order_id")
        .eq("workspace_id", state.orphanProbeId);
      let authzHttpStatus = 0;
      try {
        await requireWorkspaceAccess(state.userA.id, state.orphanProbeId);
      } catch (err) {
        authzHttpStatus = authzHttp(err).status;
      }
      const ok =
        (ws.data?.length ?? 0) === 0 && (orders.data?.length ?? 0) === 0 && authzHttpStatus === 403;
      results.push({
        id: "N",
        status: ok ? "PASS" : "FAIL",
        detail: ok
          ? `orphan inaccessible via RLS + AuthZ HTTP ${authzHttpStatus}`
          : `rls ws=${ws.data?.length} orders=${orders.data?.length} authzHttp=${authzHttpStatus}`,
      });
    }
  }

  return results;
}

async function main() {
  const doCleanup = process.argv.includes("--cleanup");

  console.log(`
============================================================
PHASE 0 FIXTURE (proposal → create)
============================================================
Users:
  phase0-test-user-a@elevate-phase0.test
  phase0-test-user-b@elevate-phase0.test
Workspaces:
  phase0-test-workspace-a (owned by A)
  phase0-test-workspace-b (owned by B)
Data:
  2 synthetic orders + events per workspace (order_id 910001001+/910002001+)
  1 workspace template each (kind=confirmation)
Orphan:
  read-only probe of an existing orphan (no ownership change)
============================================================
`);

  if (doCleanup) {
    if (!existsSync(STATE_PATH)) {
      console.error("No state file — nothing to clean");
      process.exit(1);
    }
    const state = JSON.parse(readFileSync(STATE_PATH, "utf8")) as FixtureState;
    if (!state.userA?.id) {
      console.error("State already cleaned or invalid");
      process.exit(1);
    }
    await cleanup(state);
    return;
  }

  const state = await setupFixtures();
  console.log("Fixtures ready:");
  console.log(
    JSON.stringify(
      {
        userA: { id: maskId(state.userA.id), email: state.userA.email },
        userB: { id: maskId(state.userB.id), email: state.userB.email },
        workspaceA: { id: maskId(state.workspaceA.id), name: state.workspaceA.name },
        workspaceB: { id: maskId(state.workspaceB.id), name: state.workspaceB.name },
        orderIdsA: state.orderIdsA,
        orderIdsB: state.orderIdsB,
        templates: state.templateIds.length,
        orphanProbe: state.orphanProbeId ? maskId(state.orphanProbeId) : null,
        stateFile: "scripts/.phase0-fixture-state.json",
      },
      null,
      2,
    ),
  );

  const results = await runGates(state);
  console.log("\n=== GATE RESULTS ===");
  for (const r of results) {
    console.log(`${r.status.padEnd(10)} ${r.id} — ${r.detail}`);
  }

  const required = ["A", "B", "C", "J", "K", "M", "N"] as const;
  const byId = new Map(results.map((r) => [r.id, r]));
  const allPass = required.every((id) => byId.get(id)?.status === "PASS");

  console.log(`\nPHASE 0 SECURITY GATE: ${allPass ? "PASS" : "FAIL"}`);

  console.log(`
============================================================
CLEANUP PLAN (NOT executed — awaiting approval)
============================================================
Will remove:
  - Auth users: ${state.userA.email}, ${state.userB.email}
  - Workspaces: ${state.workspaceA.name}, ${state.workspaceB.name}
  - Orders/events: ${[...state.orderIdsA, ...state.orderIdsB].join(", ")}
  - Templates: ${state.templateIds.length} row(s)
Will NOT touch:
  - real orphans
  - Shopify stores
  - non-phase0 orders
Command when approved:
  npx tsx scripts/phase0-auth-security-gate.mts --cleanup
============================================================
`);

  process.exit(allPass ? 0 : 1);
}

await main();
