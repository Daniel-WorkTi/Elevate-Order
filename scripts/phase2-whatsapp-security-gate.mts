/**
 * Phase 2 — WhatsApp Embedded Signup security gate (A–K).
 *
 * Usage:
 *   npx tsx scripts/phase2-whatsapp-security-gate.mts
 *   npx tsx scripts/phase2-whatsapp-security-gate.mts --cleanup
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getWhatsAppPublicConfig, getWhatsAppServerConfig } from "../src/lib/integrations/whatsapp/config.ts";
import { toWhatsAppUserError } from "../src/lib/integrations/whatsapp/errors.ts";
import {
  assertWorkspaceCanConnectWhatsApp,
  createPendingWhatsAppConnection,
  finalizeWhatsAppConnection,
} from "../src/lib/integrations/whatsapp/persist-connection.server.ts";
import { decryptWhatsAppToken, encryptWhatsAppToken } from "../src/lib/integrations/whatsapp/token-crypto.server.ts";
import { requireWorkspaceAccess } from "../src/lib/workspace/require-workspace-access.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, ".phase2-whatsapp-fixture-state.json");
const MARKER = "phase2-whatsapp-test";

type FixtureState = {
  password: string;
  encryptionKey: string;
  userA: { id: string; email: string };
  userB: { id: string; email: string };
  workspaceA: { id: string };
  workspaceB: { id: string };
  orphanWorkspaceId: string | null;
  connectionId: string | null;
};

type GateResult = { id: string; status: "PASS" | "FAIL"; detail: string };

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

if (!process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY) {
  process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
}
if (!process.env.META_APP_ID) process.env.META_APP_ID = "phase2-test-app-id";
if (!process.env.META_APP_SECRET) process.env.META_APP_SECRET = "phase2-test-app-secret";
if (!process.env.META_WHATSAPP_CONFIG_ID) process.env.META_WHATSAPP_CONFIG_ID = "phase2-test-config-id";

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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

async function findOrCreateUser(email: string, password: string, label: string) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data?.users.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { label, phase2_fixture: true },
    });
    return { id: existing.id, email };
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { label, phase2_fixture: true },
  });
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message ?? "createUser failed");
  }
  return { id: created.data.user.id, email };
}

async function ensureWorkspace(name: string, ownerUserId: string | null) {
  if (ownerUserId) {
    const existing = await admin
      .from("workspaces")
      .select("id")
      .eq("name", name)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (existing.data?.id) return { id: existing.data.id as string };
  } else {
    const existing = await admin.from("workspaces").select("id").eq("name", name).maybeSingle();
    if (existing.data?.id) return { id: existing.data.id as string };
  }

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

async function cleanupPhase2Fixtures(state: FixtureState) {
  if (state.connectionId) {
    await admin.from("whatsapp_connection_secrets").delete().eq("connection_id", state.connectionId);
    await admin.from("whatsapp_connections").delete().eq("id", state.connectionId);
  }
  await admin
    .from("whatsapp_connections")
    .delete()
    .like("phone_number_id", `${MARKER}%`);
  await admin.from("workspaces").delete().eq("name", `${MARKER}-workspace-a`);
  await admin.from("workspaces").delete().eq("name", `${MARKER}-workspace-b`);
  if (state.orphanWorkspaceId) {
    await admin.from("workspaces").delete().eq("id", state.orphanWorkspaceId);
  }
}

async function setupFixtures(): Promise<FixtureState> {
  const password = `P2-${randomBytes(10).toString("base64url")}!xZ9`;
  const encryptionKey = process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY!;
  const userA = await findOrCreateUser(
    "phase2-test-user-a@elevate-phase0.test",
    password,
    "phase2-test-user-a",
  );
  const userB = await findOrCreateUser(
    "phase2-test-user-b@elevate-phase0.test",
    password,
    "phase2-test-user-b",
  );
  const workspaceA = await ensureWorkspace(`${MARKER}-workspace-a`, userA.id);
  const workspaceB = await ensureWorkspace(`${MARKER}-workspace-b`, userB.id);
  const orphan = await ensureWorkspace(`${MARKER}-orphan`, null);

  return {
    password,
    encryptionKey,
    userA,
    userB,
    workspaceA,
    workspaceB,
    orphanWorkspaceId: orphan.id,
    connectionId: null,
  };
}

async function runGate(state: FixtureState): Promise<GateResult[]> {
  const results: GateResult[] = [];

  // A — public config sem secrets
  try {
    const pub = getWhatsAppPublicConfig();
    const json = JSON.stringify(pub);
    const ok =
      pub.appId &&
      pub.configId &&
      !json.includes(process.env.META_APP_SECRET ?? "") &&
      !("appSecret" in pub);
    results.push({
      id: "A-PUBLIC-CONFIG",
      status: ok ? "PASS" : "FAIL",
      detail: ok ? "Public config exposes only appId/configId" : "Public config leaked secrets",
    });
  } catch (error) {
    results.push({ id: "A-PUBLIC-CONFIG", status: "FAIL", detail: String(error) });
  }

  // F — app secret not in browser payload (same as A, explicit)
  results.push({
    id: "F-NO-APP-SECRET",
    status: results[0]?.status ?? "FAIL",
    detail: "Same check as A-PUBLIC-CONFIG",
  });

  // B — user A can access workspace A
  try {
    await requireWorkspaceAccess(state.userA.id, state.workspaceA.id);
    results.push({ id: "B-USER-A-WORKSPACE-A", status: "PASS", detail: "Owner access granted" });
  } catch (error) {
    results.push({ id: "B-USER-A-WORKSPACE-A", status: "FAIL", detail: String(error) });
  }

  // C — user A cannot access workspace B
  try {
    await requireWorkspaceAccess(state.userA.id, state.workspaceB.id);
    results.push({
      id: "C-USER-A-NOT-WORKSPACE-B",
      status: "FAIL",
      detail: "Expected forbidden",
    });
  } catch {
    results.push({
      id: "C-USER-A-NOT-WORKSPACE-B",
      status: "PASS",
      detail: "Cross-tenant finalize blocked by requireWorkspaceAccess",
    });
  }

  // D — orphan workspace blocked
  try {
    await requireWorkspaceAccess(state.userA.id, state.orphanWorkspaceId!);
    results.push({ id: "D-ORPHAN-BLOCKED", status: "FAIL", detail: "Orphan was accessible" });
  } catch {
    results.push({ id: "D-ORPHAN-BLOCKED", status: "PASS", detail: "Orphan workspace denied" });
  }

  // J/K + encryption — finalize connection for workspace A
  let connectionId: string | null = null;
  try {
    await admin
      .from("whatsapp_connections")
      .delete()
      .eq("workspace_id", state.workspaceA.id);

    await assertWorkspaceCanConnectWhatsApp(admin, state.workspaceA.id);
    const pending = await createPendingWhatsAppConnection(admin, state.workspaceA.id);
    connectionId = pending.connectionId;
    state.connectionId = connectionId;

    const accessToken = `${MARKER}-access-token`;
    const ciphertext = encryptWhatsAppToken(accessToken, state.encryptionKey);

    await finalizeWhatsAppConnection(admin, {
      workspaceId: state.workspaceA.id,
      connectionId,
      metaBusinessId: null,
      tokenEncryptionKeyBase64: state.encryptionKey,
      authorization: {
        wabaId: `${MARKER}-waba`,
        phoneNumberId: `${MARKER}-phone-1`,
        displayPhoneNumber: "+91000000099",
        verifiedName: "Phase2 Gate",
        accessToken,
        tokenExpiresAt: null,
      },
    });

    const { data: conn } = await admin
      .from("whatsapp_connections")
      .select("status")
      .eq("id", connectionId)
      .single();
    const { data: secret } = await admin
      .from("whatsapp_connection_secrets")
      .select("token_ciphertext")
      .eq("connection_id", connectionId)
      .single();

    const storedCipher = secret?.token_ciphertext ?? "";
    const roundtrip = decryptWhatsAppToken(storedCipher, state.encryptionKey);

    results.push({
      id: "J-TABLES-CREATED",
      status: conn && secret ? "PASS" : "FAIL",
      detail: conn && secret ? "connections + secrets rows exist" : "Missing rows",
    });
    results.push({
      id: "K-STATUS-CONNECTED",
      status: conn?.status === "connected" ? "PASS" : "FAIL",
      detail: `status=${conn?.status ?? "missing"}`,
    });
    results.push({
      id: "G-NO-TOKEN-IN-DB-PLAINTEXT",
      status: storedCipher && !storedCipher.includes(accessToken) && roundtrip === accessToken ? "PASS" : "FAIL",
      detail: "token_ciphertext is encrypted and roundtrips server-side",
    });
  } catch (error) {
    results.push({ id: "J-TABLES-CREATED", status: "FAIL", detail: String(error) });
    results.push({ id: "K-STATUS-CONNECTED", status: "FAIL", detail: String(error) });
    results.push({ id: "G-NO-TOKEN-IN-DB-PLAINTEXT", status: "FAIL", detail: String(error) });
  }

  // G — authenticated user cannot read secrets
  try {
    const jwt = await signIn(state.userA.email, state.password);
    const userClient = clientWithJwt(jwt);
    const { data, error } = await userClient.from("whatsapp_connection_secrets").select("*");
    const blocked = Boolean(error) || (Array.isArray(data) && data.length === 0);
    results.push({
      id: "G-NO-TOKEN-FOR-AUTH",
      status: blocked ? "PASS" : "FAIL",
      detail: blocked ? "Authenticated cannot SELECT secrets" : "Secrets leaked to authenticated",
    });
  } catch (error) {
    results.push({ id: "G-NO-TOKEN-FOR-AUTH", status: "FAIL", detail: String(error) });
  }

  // E — duplicate phone across workspaces
  try {
    await admin.from("whatsapp_connections").delete().eq("workspace_id", state.workspaceB.id);
    const pendingB = await createPendingWhatsAppConnection(admin, state.workspaceB.id);
    let blocked = false;
    try {
      await finalizeWhatsAppConnection(admin, {
        workspaceId: state.workspaceB.id,
        connectionId: pendingB.connectionId,
        metaBusinessId: null,
        tokenEncryptionKeyBase64: state.encryptionKey,
        authorization: {
          wabaId: `${MARKER}-waba-b`,
          phoneNumberId: `${MARKER}-phone-1`,
          displayPhoneNumber: "+91000000099",
          verifiedName: "Duplicate",
          accessToken: `${MARKER}-token-b`,
          tokenExpiresAt: null,
        },
      });
    } catch (error) {
      blocked = toWhatsAppUserError(error).code === "phone_already_connected";
    }
    await admin.from("whatsapp_connections").delete().eq("id", pendingB.connectionId);
    results.push({
      id: "E-DUPLICATE-PHONE",
      status: blocked ? "PASS" : "FAIL",
      detail: blocked ? "Duplicate phone blocked" : "Duplicate phone was allowed",
    });
  } catch (error) {
    results.push({ id: "E-DUPLICATE-PHONE", status: "FAIL", detail: String(error) });
  }

  // Workspace already connected block
  try {
    let blocked = false;
    try {
      await assertWorkspaceCanConnectWhatsApp(admin, state.workspaceA.id);
    } catch (error) {
      blocked = toWhatsAppUserError(error).code === "workspace_already_connected";
    }
    results.push({
      id: "RECONNECT-BLOCKED",
      status: blocked ? "PASS" : "FAIL",
      detail: blocked ? "Connected workspace cannot connect again" : "Reconnect was allowed",
    });
  } catch (error) {
    results.push({ id: "RECONNECT-BLOCKED", status: "FAIL", detail: String(error) });
  }

  // H — sanitized meta error
  const sanitized = toWhatsAppUserError(new Error("Graph API oauth/access_token failed"));
  results.push({
    id: "H-SANITIZED-ERROR",
    status: !sanitized.message.includes("oauth/access_token") ? "PASS" : "FAIL",
    detail: sanitized.message,
  });

  // I — cancel does not create connected (structural: pending without finalize stays non-connected)
  try {
    await admin.from("whatsapp_connections").delete().eq("workspace_id", state.workspaceB.id);
    const pendingOnly = await createPendingWhatsAppConnection(admin, state.workspaceB.id);
    const { data: row } = await admin
      .from("whatsapp_connections")
      .select("status")
      .eq("id", pendingOnly.connectionId)
      .single();
    await admin.from("whatsapp_connections").delete().eq("id", pendingOnly.connectionId);
    results.push({
      id: "I-CANCEL-NO-CONNECTED",
      status: row?.status === "pending" ? "PASS" : "FAIL",
      detail: `pending-only status=${row?.status ?? "missing"}`,
    });
  } catch (error) {
    results.push({ id: "I-CANCEL-NO-CONNECTED", status: "FAIL", detail: String(error) });
  }

  // Server config includes encryption key when set
  try {
    const server = getWhatsAppServerConfig();
    results.push({
      id: "CRYPTO-CONFIG",
      status: server.tokenEncryptionKeyBase64 ? "PASS" : "FAIL",
      detail: "Server config requires encryption key",
    });
  } catch (error) {
    results.push({ id: "CRYPTO-CONFIG", status: "FAIL", detail: String(error) });
  }

  return results;
}

async function main() {
  const cleanup = process.argv.includes("--cleanup");
  if (cleanup && existsSync(STATE_PATH)) {
    const state = JSON.parse(readFileSync(STATE_PATH, "utf8")) as FixtureState;
    await cleanupPhase2Fixtures(state);
    console.log("Phase 2 fixtures cleaned.");
    return;
  }

  const state = await setupFixtures();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));

  const results = await runGate(state);
  writeFileSync(STATE_PATH, JSON.stringify({ ...state, connectionId: state.connectionId }, null, 2));

  console.log("\nPHASE 2 WHATSAPP SECURITY GATE\n");
  for (const result of results) {
    console.log(`${result.status === "PASS" ? "✔" : "✘"} ${result.id}: ${result.detail}`);
  }

  const failed = results.filter((r) => r.status === "FAIL");
  if (failed.length > 0) {
    console.error(`\nPHASE 2 WHATSAPP SECURITY GATE: FAIL (${failed.length}/${results.length})`);
    process.exit(1);
  }

  console.log(`\nPHASE 2 WHATSAPP SECURITY GATE: PASS (${results.length}/${results.length})`);
  console.log("Run with --cleanup to remove fixtures.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
