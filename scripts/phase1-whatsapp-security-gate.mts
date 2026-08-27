/**
 * Phase 1 — WhatsApp database security gate.
 *
 * Requires migration 20260827200000_whatsapp_foundation.sql applied on remote.
 *
 * Usage:
 *   npx tsx scripts/phase1-whatsapp-security-gate.mts
 *   npx tsx scripts/phase1-whatsapp-security-gate.mts --cleanup
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, ".phase1-whatsapp-fixture-state.json");
const MARKER = "phase1-whatsapp-test";

type FixtureState = {
  createdAt: string;
  password: string;
  userA: { id: string; email: string };
  userB: { id: string; email: string };
  workspaceA: { id: string };
  workspaceB: { id: string };
  connectionA: string;
  connectionB: string;
  conversationA: string;
  conversationB: string;
  messageA: string;
  messageB: string;
  orderUuidA: string | null;
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

process.env.SUPABASE_URL = url;
process.env.SUPABASE_SERVICE_ROLE_KEY = serviceKey;

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function maskId(id: string): string {
  return id.length < 12 ? "***" : `${id.slice(0, 8)}…${id.slice(-4)}`;
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
    throw new Error(`signIn failed: ${error?.message ?? "no session"}`);
  }
  return data.session.access_token;
}

async function assertMigrationApplied() {
  const { error } = await admin.from("whatsapp_connections").select("id").limit(1);
  const missing =
    error?.message?.includes("does not exist") ||
    error?.code === "42P01" ||
    error?.message?.includes("Could not find the table");
  if (missing) {
    throw new Error(
      "WhatsApp tables missing. Apply supabase/migrations/20260827200000_whatsapp_foundation.sql in Supabase SQL Editor, then re-run this script.",
    );
  }
  if (error) {
    throw new Error(`Migration probe failed: ${error.message}`);
  }
}

async function findOrCreateUser(email: string, password: string, label: string) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data?.users.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { label, phase1_fixture: true },
    });
    return { id: existing.id, email };
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { label, phase1_fixture: true },
  });
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message ?? "createUser failed");
  }
  return { id: created.data.user.id, email };
}

async function ensureWorkspace(name: string, ownerUserId: string) {
  const existing = await admin
    .from("workspaces")
    .select("id")
    .eq("name", name)
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  if (existing.data?.id) return { id: existing.data.id as string };

  const inserted = await admin
    .from("workspaces")
    .insert({ name, owner_user_id: ownerUserId })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message ?? "workspace insert failed");
  }
  return { id: inserted.data.id as string };
}

async function ensureOrder(workspaceId: string, orderIdNum: number): Promise<string> {
  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("order_id", orderIdNum)
    .maybeSingle();
  if (existing?.id) {
    await admin
      .from("orders")
      .update({ workspace_id: workspaceId, source: MARKER })
      .eq("id", existing.id);
    return existing.id as string;
  }
  const { data, error } = await admin
    .from("orders")
    .insert({
      order_id: orderIdNum,
      workspace_id: workspaceId,
      source: MARKER,
      status_name: "confirmed",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "order insert failed");
  return data.id as string;
}

async function setupFixtures(): Promise<FixtureState> {
  const password = `P1-${randomBytes(10).toString("base64url")}!xZ9`;
  const userA = await findOrCreateUser(
    "phase1-test-user-a@elevate-phase0.test",
    password,
    "phase1-test-user-a",
  );
  const userB = await findOrCreateUser(
    "phase1-test-user-b@elevate-phase0.test",
    password,
    "phase1-test-user-b",
  );
  const workspaceA = await ensureWorkspace("phase1-test-workspace-a", userA.id);
  const workspaceB = await ensureWorkspace("phase1-test-workspace-b", userB.id);
  const orderUuidA = await ensureOrder(workspaceA.id, 920_001_001);

  // Connection A
  const { data: connAExisting } = await admin
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", workspaceA.id)
    .eq("phone_number_id", `${MARKER}-pn-a`)
    .maybeSingle();

  let connectionA = connAExisting?.id as string | undefined;
  if (!connectionA) {
    const ins = await admin
      .from("whatsapp_connections")
      .insert({
        workspace_id: workspaceA.id,
        waba_id: `${MARKER}-waba-a`,
        phone_number_id: `${MARKER}-pn-a`,
        display_phone_number: "+91000000001",
        status: "connected",
        connected_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "conn A failed");
    connectionA = ins.data.id as string;
  }

  const { data: connBExisting } = await admin
    .from("whatsapp_connections")
    .select("id")
    .eq("workspace_id", workspaceB.id)
    .eq("phone_number_id", `${MARKER}-pn-b`)
    .maybeSingle();

  let connectionB = connBExisting?.id as string | undefined;
  if (!connectionB) {
    const ins = await admin
      .from("whatsapp_connections")
      .insert({
        workspace_id: workspaceB.id,
        waba_id: `${MARKER}-waba-b`,
        phone_number_id: `${MARKER}-pn-b`,
        display_phone_number: "+91000000002",
        status: "connected",
        connected_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "conn B failed");
    connectionB = ins.data.id as string;
  }

  const { data: convAExisting } = await admin
    .from("whatsapp_conversations")
    .select("id")
    .eq("workspace_id", workspaceA.id)
    .eq("customer_phone_e164", "+91000000011")
    .maybeSingle();

  let conversationA = convAExisting?.id as string | undefined;
  if (!conversationA) {
    const ins = await admin
      .from("whatsapp_conversations")
      .insert({
        workspace_id: workspaceA.id,
        connection_id: connectionA,
        order_id: orderUuidA,
        customer_phone_e164: "+91000000011",
        status: "open",
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "conv A failed");
    conversationA = ins.data.id as string;
  }

  const { data: convBExisting } = await admin
    .from("whatsapp_conversations")
    .select("id")
    .eq("workspace_id", workspaceB.id)
    .eq("customer_phone_e164", "+91000000022")
    .maybeSingle();

  let conversationB = convBExisting?.id as string | undefined;
  if (!conversationB) {
    const ins = await admin
      .from("whatsapp_conversations")
      .insert({
        workspace_id: workspaceB.id,
        connection_id: connectionB,
        customer_phone_e164: "+91000000022",
        status: "open",
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "conv B failed");
    conversationB = ins.data.id as string;
  }

  const { data: msgAExisting } = await admin
    .from("whatsapp_messages")
    .select("id")
    .eq("workspace_id", workspaceA.id)
    .eq("whatsapp_message_id", `${MARKER}-msg-a`)
    .maybeSingle();

  let messageA = msgAExisting?.id as string | undefined;
  if (!messageA) {
    const ins = await admin
      .from("whatsapp_messages")
      .insert({
        workspace_id: workspaceA.id,
        connection_id: connectionA,
        conversation_id: conversationA,
        order_id: orderUuidA,
        whatsapp_message_id: `${MARKER}-msg-a`,
        direction: "inbound",
        message_type: "text",
        message_body: MARKER,
        status: "received",
        sender_phone_e164: "+91000000011",
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "msg A failed");
    messageA = ins.data.id as string;
  }

  const { data: msgBExisting } = await admin
    .from("whatsapp_messages")
    .select("id")
    .eq("workspace_id", workspaceB.id)
    .eq("whatsapp_message_id", `${MARKER}-msg-b`)
    .maybeSingle();

  let messageB = msgBExisting?.id as string | undefined;
  if (!messageB) {
    const ins = await admin
      .from("whatsapp_messages")
      .insert({
        workspace_id: workspaceB.id,
        connection_id: connectionB,
        conversation_id: conversationB,
        whatsapp_message_id: `${MARKER}-msg-b`,
        direction: "outbound",
        message_type: "text",
        message_body: MARKER,
        status: "queued",
        recipient_phone_e164: "+91000000022",
      })
      .select("id")
      .single();
    if (ins.error || !ins.data) throw new Error(ins.error?.message ?? "msg B failed");
    messageB = ins.data.id as string;
  }

  const { data: orphan } = await admin
    .from("workspaces")
    .select("id")
    .is("owner_user_id", null)
    .limit(1)
    .maybeSingle();

  const state: FixtureState = {
    createdAt: new Date().toISOString(),
    password,
    userA,
    userB,
    workspaceA,
    workspaceB,
    connectionA,
    connectionB,
    conversationA,
    conversationB,
    messageA,
    messageB,
    orderUuidA,
    orphanProbeId: orphan?.id ?? null,
  };
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  return state;
}

async function cleanup(state: FixtureState) {
  await admin.from("whatsapp_messages").delete().eq("id", state.messageA);
  await admin.from("whatsapp_messages").delete().eq("id", state.messageB);
  await admin.from("whatsapp_conversations").delete().eq("id", state.conversationA);
  await admin.from("whatsapp_conversations").delete().eq("id", state.conversationB);
  await admin.from("whatsapp_connection_secrets").delete().eq("connection_id", state.connectionA);
  await admin.from("whatsapp_connection_secrets").delete().eq("connection_id", state.connectionB);
  await admin.from("whatsapp_connections").delete().eq("id", state.connectionA);
  await admin.from("whatsapp_connections").delete().eq("id", state.connectionB);
  if (state.orderUuidA) {
    await admin.from("orders").delete().eq("id", state.orderUuidA).eq("source", MARKER);
  }
  await admin.from("workspaces").delete().eq("id", state.workspaceA.id);
  await admin.from("workspaces").delete().eq("id", state.workspaceB.id);
  await admin.auth.admin.deleteUser(state.userA.id);
  await admin.auth.admin.deleteUser(state.userB.id);
  writeFileSync(STATE_PATH, JSON.stringify({ cleanedAt: new Date().toISOString() }, null, 2));
}

async function runGates(state: FixtureState): Promise<GateResult[]> {
  const results: GateResult[] = [];
  const jwtA = await signIn(state.userA.email, state.password);
  const jwtB = await signIn(state.userB.email, state.password);
  const clientA = clientWithJwt(jwtA);
  const clientB = clientWithJwt(jwtB);

  // A — own SELECT
  {
    const conn = await clientA
      .from("whatsapp_connections")
      .select("id")
      .eq("id", state.connectionA);
    const conv = await clientA
      .from("whatsapp_conversations")
      .select("id")
      .eq("id", state.conversationA);
    const msg = await clientA.from("whatsapp_messages").select("id").eq("id", state.messageA);
    const ok =
      !conn.error &&
      (conn.data?.length ?? 0) === 1 &&
      !conv.error &&
      (conv.data?.length ?? 0) === 1 &&
      !msg.error &&
      (msg.data?.length ?? 0) === 1;
    results.push({
      id: "A",
      status: ok ? "PASS" : "FAIL",
      detail: ok ? "User A SELECT own connection/conversation/message" : "User A own read failed",
    });
  }

  // B — cross-tenant deny
  {
    const conn = await clientA
      .from("whatsapp_connections")
      .select("id")
      .eq("id", state.connectionB);
    const msg = await clientA.from("whatsapp_messages").select("id").eq("id", state.messageB);
    const denied = (conn.data?.length ?? 0) === 0 && (msg.data?.length ?? 0) === 0;
    results.push({
      id: "B",
      status: denied ? "PASS" : "FAIL",
      detail: denied ? "User A cannot SELECT Workspace B WhatsApp rows" : "CROSS-TENANT LEAK",
    });
  }

  // C — inverse
  {
    const conn = await clientB
      .from("whatsapp_connections")
      .select("id")
      .eq("id", state.connectionA);
    const denied = (conn.data?.length ?? 0) === 0;
    results.push({
      id: "C",
      status: denied ? "PASS" : "FAIL",
      detail: denied ? "User B cannot SELECT Workspace A connection" : "CROSS-TENANT LEAK",
    });
  }

  // Authenticated write deny — connections
  // Note: Postgres RLS blocks INSERT with error; UPDATE/DELETE return 0 rows (no error).
  {
    const before = await admin
      .from("whatsapp_connections")
      .select("status")
      .eq("id", state.connectionA)
      .single();

    const ins = await clientA.from("whatsapp_connections").insert({
      workspace_id: state.workspaceA.id,
      waba_id: "hack",
      phone_number_id: "hack-pn",
      status: "connected",
    });

    const upd = await clientA
      .from("whatsapp_connections")
      .update({ status: "error" })
      .eq("id", state.connectionA)
      .select("id");

    const del = await clientA
      .from("whatsapp_connections")
      .delete()
      .eq("id", state.connectionA)
      .select("id");

    const after = await admin
      .from("whatsapp_connections")
      .select("status")
      .eq("id", state.connectionA)
      .single();

    const insertBlocked = Boolean(ins.error);
    const updateNoOp = (upd.data?.length ?? 0) === 0 && after.data?.status === before.data?.status;
    const deleteNoOp = (del.data?.length ?? 0) === 0 && !after.error;
    const denied = insertBlocked && updateNoOp && deleteNoOp;

    results.push({
      id: "WRITE-CONN",
      status: denied ? "PASS" : "FAIL",
      detail: denied
        ? "Authenticated cannot INSERT (RLS error) or mutate connections (UPDATE/DELETE no-op)"
        : `insertBlocked=${insertBlocked} updateNoOp=${updateNoOp} deleteNoOp=${deleteNoOp}`,
    });
  }

  // Authenticated write deny — messages
  {
    const before = await admin
      .from("whatsapp_messages")
      .select("status")
      .eq("id", state.messageA)
      .single();

    const ins = await clientA.from("whatsapp_messages").insert({
      workspace_id: state.workspaceA.id,
      connection_id: state.connectionA,
      direction: "outbound",
      message_type: "text",
      status: "delivered",
      message_body: "forged",
    });

    const upd = await clientA
      .from("whatsapp_messages")
      .update({ status: "delivered" })
      .eq("id", state.messageA)
      .select("id");

    const after = await admin
      .from("whatsapp_messages")
      .select("status")
      .eq("id", state.messageA)
      .single();

    const insertBlocked = Boolean(ins.error);
    const updateNoOp = (upd.data?.length ?? 0) === 0 && after.data?.status === before.data?.status;
    const denied = insertBlocked && updateNoOp;

    results.push({
      id: "WRITE-MSG",
      status: denied ? "PASS" : "FAIL",
      detail: denied
        ? "Authenticated cannot INSERT (RLS error) or alter messages (UPDATE no-op)"
        : `insertBlocked=${insertBlocked} updateNoOp=${updateNoOp}`,
    });
  }

  // Secrets — authenticated zero access
  {
    const sel = await clientA
      .from("whatsapp_connection_secrets")
      .select("connection_id")
      .eq("connection_id", state.connectionA);
    const denied = Boolean(sel.error) || (sel.data?.length ?? 0) === 0;
    results.push({
      id: "SECRETS",
      status: denied ? "PASS" : "FAIL",
      detail: denied ? "Authenticated cannot read whatsapp_connection_secrets" : "SECRETS LEAK",
    });
  }

  // Consistency — message workspace A + connection B
  {
    const bad = await admin.from("whatsapp_messages").insert({
      workspace_id: state.workspaceA.id,
      connection_id: state.connectionB,
      direction: "inbound",
      message_type: "text",
      status: "received",
    });
    const blocked = Boolean(bad.error);
    results.push({
      id: "CONSISTENCY-MSG",
      status: blocked ? "PASS" : "FAIL",
      detail: blocked
        ? `DB blocked cross-workspace message (${bad.error?.code})`
        : "Cross-workspace message insert allowed",
    });
  }

  // Consistency — conversation workspace A + connection B
  {
    const bad = await admin.from("whatsapp_conversations").insert({
      workspace_id: state.workspaceA.id,
      connection_id: state.connectionB,
      customer_phone_e164: "+91000000099",
      status: "open",
    });
    const blocked = Boolean(bad.error);
    results.push({
      id: "CONSISTENCY-CONV",
      status: blocked ? "PASS" : "FAIL",
      detail: blocked
        ? `DB blocked cross-workspace conversation (${bad.error?.code})`
        : "Cross-workspace conversation insert allowed",
    });
  }

  // Idempotency — duplicate whatsapp_message_id
  {
    const dup = await admin.from("whatsapp_messages").insert({
      workspace_id: state.workspaceA.id,
      connection_id: state.connectionA,
      whatsapp_message_id: `${MARKER}-msg-a`,
      direction: "inbound",
      message_type: "text",
      status: "received",
    });
    const blocked = Boolean(dup.error);
    results.push({
      id: "IDEMPOTENCY",
      status: blocked ? "PASS" : "FAIL",
      detail: blocked ? "Duplicate whatsapp_message_id rejected" : "Idempotency index missing",
    });
  }

  // service_role can write secrets
  {
    const upsert = await admin.from("whatsapp_connection_secrets").upsert({
      connection_id: state.connectionA,
      token_expires_at: null,
    });
    results.push({
      id: "SERVICE-ROLE",
      status: !upsert.error ? "PASS" : "FAIL",
      detail: !upsert.error
        ? "service_role can upsert whatsapp_connection_secrets"
        : upsert.error.message,
    });
  }

  // Orphan — no WhatsApp on orphan workspace (read-only)
  if (state.orphanProbeId) {
    const conn = await clientA
      .from("whatsapp_connections")
      .select("id")
      .eq("workspace_id", state.orphanProbeId);
    results.push({
      id: "ORPHAN",
      status: (conn.data?.length ?? 0) === 0 ? "PASS" : "FAIL",
      detail: "Orphan workspace has no accessible WhatsApp data for User A",
    });
  } else {
    results.push({ id: "ORPHAN", status: "NOT TESTED", detail: "No orphan workspace" });
  }

  return results;
}

async function main() {
  const doCleanup = process.argv.includes("--cleanup");

  console.log(`
============================================================
PHASE 1 — WHATSAPP DATABASE SECURITY GATE
============================================================
`);

  await assertMigrationApplied();

  if (doCleanup) {
    if (!existsSync(STATE_PATH)) {
      console.error("No fixture state file");
      process.exit(1);
    }
    const state = JSON.parse(readFileSync(STATE_PATH, "utf8")) as FixtureState;
    if (!state.connectionA) {
      console.log("Already cleaned");
      return;
    }
    await cleanup(state);
    console.log("Cleanup complete.");
    return;
  }

  const state = await setupFixtures();
  console.log(
    "Fixtures:",
    JSON.stringify(
      {
        userA: maskId(state.userA.id),
        userB: maskId(state.userB.id),
        workspaceA: maskId(state.workspaceA.id),
        workspaceB: maskId(state.workspaceB.id),
        connectionA: maskId(state.connectionA),
        connectionB: maskId(state.connectionB),
      },
      null,
      2,
    ),
  );

  const results = await runGates(state);
  console.log("\n=== RESULTS ===");
  for (const r of results) {
    console.log(`${r.status.padEnd(10)} ${r.id} — ${r.detail}`);
  }

  const required = [
    "A",
    "B",
    "C",
    "WRITE-CONN",
    "WRITE-MSG",
    "SECRETS",
    "CONSISTENCY-MSG",
    "CONSISTENCY-CONV",
    "IDEMPOTENCY",
    "SERVICE-ROLE",
  ];
  const pass = required.every((id) => results.find((r) => r.id === id)?.status === "PASS");
  console.log(`\nPHASE 1 WHATSAPP SECURITY GATE: ${pass ? "PASS" : "FAIL"}`);

  console.log(`
Cleanup (after approval):
  npx tsx scripts/phase1-whatsapp-security-gate.mts --cleanup
`);

  process.exit(pass ? 0 : 1);
}

await main();
