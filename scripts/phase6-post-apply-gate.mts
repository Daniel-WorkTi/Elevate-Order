/**
 * Phase 6 — live POST-APPLY gate against remote Supabase.
 * Isolated fixtures only — cleaned up on exit (success or failure).
 *
 * Usage:
 *   npx tsx scripts/phase6-post-apply-gate.mts
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKER = "phase6-cod-gate";
const ORDER_BASE = 990_600_000;

type GateResult = { id: string; status: "PASS" | "FAIL"; detail: string };

type FixtureState = {
  password: string;
  userA: { id: string; email: string };
  userB: { id: string; email: string };
  workspaceA: string;
  workspaceB: string;
  connectionA: string;
  connectionB: string;
  orderCounter: number;
};

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

loadEnv(join(__dirname, "../.env"));
loadEnv(join(__dirname, "../.env.local"));

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!url || !serviceKey || !anonKey) {
  console.error("Missing SUPABASE_URL / SERVICE_ROLE / PUBLISHABLE key");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results: GateResult[] = [];
const tracked = {
  orderUuids: [] as string[],
  messageIds: [] as string[],
  conversationIds: [] as string[],
  connectionIds: [] as string[],
  workspaceIds: [] as string[],
  userIds: [] as string[],
};

function pass(id: string, detail: string) {
  results.push({ id, status: "PASS", detail });
  console.log(`PASS ${id}: ${detail}`);
}

function fail(id: string, detail: string) {
  results.push({ id, status: "FAIL", detail });
  console.error(`FAIL ${id}: ${detail}`);
}

function rpcMessage(error: { message?: string } | null): string {
  return error?.message ?? "";
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

async function findOrCreateUser(email: string, password: string, label: string) {
  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = listed.data?.users.find((u) => u.email === email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { label, phase6_fixture: true },
    });
    return { id: existing.id, email };
  }
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { label, phase6_fixture: true },
  });
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message ?? "createUser failed");
  }
  return { id: created.data.user.id, email };
}

async function createWorkspace(name: string, ownerUserId: string): Promise<string> {
  const { data, error } = await admin
    .from("workspaces")
    .insert({ name, owner_user_id: ownerUserId })
    .select("id, whatsapp_auto_confirm")
    .single();
  if (error || !data) throw new Error(error?.message ?? "workspace insert failed");
  tracked.workspaceIds.push(data.id as string);
  return data.id as string;
}

async function createConnection(workspaceId: string, suffix: string): Promise<string> {
  const { data, error } = await admin
    .from("whatsapp_connections")
    .insert({
      workspace_id: workspaceId,
      provider: "whatsapp_web",
      waba_id: `${MARKER}-waba-${suffix}`,
      phone_number_id: `${MARKER}-pn-${suffix}`,
      display_phone_number: suffix === "a" ? "+91060000001" : "+91060000002",
      status: "connected",
      connected_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "connection insert failed");
  tracked.connectionIds.push(data.id as string);
  return data.id as string;
}

async function createConversation(input: {
  workspaceId: string;
  connectionId: string;
  phone: string;
  orderId?: string | null;
}): Promise<string> {
  const { data, error } = await admin
    .from("whatsapp_conversations")
    .insert({
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      customer_phone_e164: input.phone,
      order_id: input.orderId ?? null,
      status: "open",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "conversation insert failed");
  tracked.conversationIds.push(data.id as string);
  return data.id as string;
}

async function createMessage(input: {
  workspaceId: string;
  connectionId: string;
  conversationId: string;
  orderId?: string | null;
  direction: "inbound" | "outbound";
  externalId: string;
  body?: string;
}): Promise<string> {
  const { data, error } = await admin
    .from("whatsapp_messages")
    .insert({
      workspace_id: input.workspaceId,
      connection_id: input.connectionId,
      conversation_id: input.conversationId,
      order_id: input.orderId ?? null,
      whatsapp_message_id: input.externalId,
      direction: input.direction,
      message_type: "text",
      message_body: input.body ?? MARKER,
      status: input.direction === "inbound" ? "received" : "sent",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "message insert failed");
  tracked.messageIds.push(data.id as string);
  return data.id as string;
}

async function createOrder(
  fx: FixtureState,
  workspaceId: string,
  status_name: string,
  details: string | null = null,
): Promise<{ id: string; order_id: number; status_name: string; details: string | null }> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    fx.orderCounter += 1;
    const order_id = ORDER_BASE + fx.orderCounter * 997 + attempt;
    const { data, error } = await admin
      .from("orders")
      .insert({
        order_id,
        workspace_id: workspaceId,
        source: MARKER,
        status_name,
        details,
      })
      .select("id, order_id, status_name, details")
      .single();
    if (error?.code === "23505") continue;
    if (error || !data) throw new Error(error?.message ?? "order insert failed");
    tracked.orderUuids.push(data.id as string);
    return data as { id: string; order_id: number; status_name: string; details: string | null };
  }
  throw new Error("order insert failed: exhausted unique order_id attempts");
}

async function purgeStaleMarkerFixtures() {
  const { data: orders } = await admin.from("orders").select("id").eq("source", MARKER);
  const orderIds = (orders ?? []).map((o) => o.id as string);
  if (orderIds.length) {
    await admin.from("order_confirmation_events").delete().in("order_uuid", orderIds);
    await admin.from("orders").delete().in("id", orderIds);
  }
  const { data: workspaces } = await admin
    .from("workspaces")
    .select("id")
    .like("name", `${MARKER}%`);
  const workspaceIds = (workspaces ?? []).map((w) => w.id as string);
  if (workspaceIds.length) {
    await admin.from("order_confirmation_events").delete().in("workspace_id", workspaceIds);
    await admin.from("whatsapp_messages").delete().in("workspace_id", workspaceIds);
    await admin.from("whatsapp_conversations").delete().in("workspace_id", workspaceIds);
    await admin.from("whatsapp_connections").delete().in("workspace_id", workspaceIds);
    await admin.from("orders").delete().in("workspace_id", workspaceIds).eq("source", MARKER);
    await admin.from("workspaces").delete().in("id", workspaceIds);
  }
}

async function setupFixtures(): Promise<FixtureState> {
  await purgeStaleMarkerFixtures();
  const password = `P6-${randomBytes(10).toString("base64url")}!xZ9`;
  const userA = await findOrCreateUser(
    "phase6-cod-gate-user-a@elevate-phase6.test",
    password,
    "phase6-user-a",
  );
  const userB = await findOrCreateUser(
    "phase6-cod-gate-user-b@elevate-phase6.test",
    password,
    "phase6-user-b",
  );
  tracked.userIds.push(userA.id, userB.id);

  const workspaceA = await createWorkspace(`${MARKER}-workspace-a`, userA.id);
  const workspaceB = await createWorkspace(`${MARKER}-workspace-b`, userB.id);
  const connectionA = await createConnection(workspaceA, "a");
  const connectionB = await createConnection(workspaceB, "b");

  return {
    password,
    userA,
    userB,
    workspaceA,
    workspaceB,
    connectionA,
    connectionB,
    orderCounter: 0,
  };
}

async function cleanupFixtures() {
  if (tracked.orderUuids.length) {
    await admin.from("order_confirmation_events").delete().in("order_uuid", tracked.orderUuids);
  }
  if (tracked.workspaceIds.length) {
    await admin.from("order_confirmation_events").delete().in("workspace_id", tracked.workspaceIds);
  }
  if (tracked.messageIds.length) {
    await admin.from("whatsapp_messages").delete().in("id", tracked.messageIds);
  }
  if (tracked.conversationIds.length) {
    await admin.from("whatsapp_conversations").delete().in("id", tracked.conversationIds);
  }
  if (tracked.connectionIds.length) {
    await admin.from("whatsapp_connections").delete().in("id", tracked.connectionIds);
  }
  if (tracked.orderUuids.length) {
    await admin.from("orders").delete().in("id", tracked.orderUuids).eq("source", MARKER);
  }
  if (tracked.workspaceIds.length) {
    await admin.from("workspaces").delete().in("id", tracked.workspaceIds);
  }
  for (const userId of tracked.userIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}

async function confirmRpc(input: {
  workspaceId: string;
  orderUuid: string;
  source: "whatsapp_auto" | "operator";
  conversationId?: string | null;
  messageId?: string | null;
  actorUserId?: string | null;
}) {
  return admin.rpc("confirm_order_cod", {
    p_workspace_id: input.workspaceId,
    p_order_uuid: input.orderUuid,
    p_source: input.source,
    p_conversation_id: input.conversationId ?? null,
    p_message_id: input.messageId ?? null,
    p_actor_user_id: input.actorUserId ?? null,
    p_intent_reason: null,
  });
}

async function classifyRpc(input: {
  workspaceId: string;
  messageId: string;
  conversationId: string;
  intent: "confirm" | "reject" | "needs_operator";
  orderUuid?: string | null;
}) {
  return admin.rpc("record_confirmation_classification", {
    p_workspace_id: input.workspaceId,
    p_message_id: input.messageId,
    p_conversation_id: input.conversationId,
    p_intent: input.intent,
    p_reason: null,
    p_order_uuid: input.orderUuid ?? null,
    p_source: "system",
  });
}

async function runLiveGates(fx: FixtureState) {
  const jwtA = await signIn(fx.userA.email, fx.password);
  const jwtB = await signIn(fx.userB.email, fx.password);
  const clientA = clientWithJwt(jwtA);

  // D — authenticated cannot EXECUTE confirm_order_cod
  {
    const waiting = await createOrder(fx, fx.workspaceA, "Waiting");
    const { data, error } = await clientA.rpc("confirm_order_cod", {
      p_workspace_id: fx.workspaceA,
      p_order_uuid: waiting.id,
      p_source: "operator",
      p_actor_user_id: fx.userA.id,
    });
    const msg = rpcMessage(error);
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    const denied =
      Boolean(error) &&
      (msg.includes("permission denied") ||
        msg.includes("42501") ||
        msg.toLowerCase().includes("not authorized"));
    if (denied) {
      pass("D", `authenticated RPC denied: ${msg.slice(0, 120)}`);
    } else if (!error && row?.applied === true) {
      fail(
        "D",
        "authenticated can EXECUTE confirm_order_cod and mutate orders — REVOKE EXECUTE FROM authenticated, anon required",
      );
    } else {
      fail("D", `expected permission denied, got: ${msg || JSON.stringify(row)}`);
    }
  }

  // E — service_role executes confirm_order_cod (operator path)
  {
    const waiting = await createOrder(fx, fx.workspaceA, "Waiting", "gate-E");
    const before = { ...waiting };
    const { data, error } = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: waiting.id,
      source: "operator",
      actorUserId: fx.userA.id,
    });
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    const ok = !error && row?.applied === true && row?.already_confirmed === false;
    const { data: after } = await admin
      .from("orders")
      .select("status_name, details, confirmed_at, confirmation_source")
      .eq("id", waiting.id)
      .single();
    if (ok && after?.confirmed_at && after.confirmation_source === "operator") {
      pass("E", "service_role confirm_order_cod applied for workspace owner operator");
    } else {
      fail("E", rpcMessage(error) || `unexpected row ${JSON.stringify(row)}`);
    }
    if (after?.status_name === before.status_name && after?.details === before.details) {
      pass("supply-unchanged-E", "status_name/details untouched on operator confirm");
    } else {
      fail("supply-unchanged-E", `supply mutated: ${JSON.stringify(after)}`);
    }
  }

  // F — workspace A cannot confirm order in workspace B
  {
    const orderB = await createOrder(fx, fx.workspaceB, "Waiting");
    const { error } = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: orderB.id,
      source: "operator",
      actorUserId: fx.userA.id,
    });
    if (rpcMessage(error).includes("order_not_found")) {
      pass("F", "cross-workspace order confirm rejected (order_not_found)");
    } else {
      fail("F", rpcMessage(error) || "expected order_not_found");
    }
  }

  // G — workspace A cannot use message/conversation from workspace B
  {
    const orderA = await createOrder(fx, fx.workspaceA, "Waiting");
    const convB = await createConversation({
      workspaceId: fx.workspaceB,
      connectionId: fx.connectionB,
      phone: "+91060000031",
      orderId: null,
    });
    const msgB = await createMessage({
      workspaceId: fx.workspaceB,
      connectionId: fx.connectionB,
      conversationId: convB,
      direction: "inbound",
      externalId: `${MARKER}-cross-msg`,
    });
    const { error } = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: orderA.id,
      source: "whatsapp_auto",
      conversationId: convB,
      messageId: msgB,
    });
    const msg = rpcMessage(error);
    if (msg.includes("conversation_not_found") || msg.includes("message_not_found")) {
      pass("G", `cross-tenant message/conversation rejected: ${msg}`);
    } else {
      fail("G", msg || "expected conversation_not_found or message_not_found");
    }

    // compound FK — direct poison update must fail
    const { error: fkError } = await admin
      .from("orders")
      .update({
        confirmation_message_id: msgB,
        confirmation_conversation_id: convB,
      })
      .eq("id", orderA.id)
      .eq("workspace_id", fx.workspaceA);
    if (fkError && /foreign key|violates foreign key constraint/i.test(fkError.message)) {
      pass("G-fk", "compound FK blocks cross-tenant confirmation_message_id");
    } else {
      fail("G-fk", fkError?.message ?? "expected FK violation on cross-tenant update");
    }
  }

  // H — double confirmation idempotent
  {
    const order = await createOrder(fx, fx.workspaceA, "Waiting", "gate-H");
    const conv = await createConversation({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      phone: "+91060000041",
      orderId: order.id,
    });
    const msg = await createMessage({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      conversationId: conv,
      orderId: order.id,
      direction: "inbound",
      externalId: `${MARKER}-h-inbound`,
    });
    const first = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "whatsapp_auto",
      conversationId: conv,
      messageId: msg,
    });
    const firstRow = (first.data as Array<Record<string, unknown>> | null)?.[0];
    const second = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "whatsapp_auto",
      conversationId: conv,
      messageId: msg,
    });
    const secondRow = (second.data as Array<Record<string, unknown>> | null)?.[0];
    const { count } = await admin
      .from("order_confirmation_events")
      .select("id", { count: "exact", head: true })
      .eq("order_uuid", order.id)
      .eq("event_type", "order_confirmed");
    if (
      !first.error &&
      firstRow?.applied === true &&
      !second.error &&
      secondRow?.applied === false &&
      secondRow?.already_confirmed === true &&
      count === 1
    ) {
      pass("H", "second confirm is NO-OP; exactly one order_confirmed event");
    } else {
      fail(
        "H",
        `first=${JSON.stringify(firstRow)} second=${JSON.stringify(secondRow)} events=${count}`,
      );
    }
  }

  // P — operator from other workspace denied
  {
    const order = await createOrder(fx, fx.workspaceA, "Waiting", "gate-P");
    const { error } = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "operator",
      actorUserId: fx.userB.id,
    });
    if (rpcMessage(error).includes("operator_not_authorized_for_workspace")) {
      pass("P", "foreign operator rejected");
    } else {
      fail("P", rpcMessage(error) || "expected operator_not_authorized_for_workspace");
    }
  }

  // Q — correct owner operator allowed
  {
    const order = await createOrder(fx, fx.workspaceA, "Waiting", "gate-Q");
    const { data, error } = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "operator",
      actorUserId: fx.userA.id,
    });
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    if (!error && row?.applied === true) pass("Q", "workspace owner operator confirm allowed");
    else fail("Q", rpcMessage(error) || JSON.stringify(row));
  }

  // Classification inbound / outbound
  {
    const conv = await createConversation({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      phone: "+91060000051",
    });
    const inbound = await createMessage({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      conversationId: conv,
      direction: "inbound",
      externalId: `${MARKER}-cls-in`,
    });
    const outbound = await createMessage({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      conversationId: conv,
      direction: "outbound",
      externalId: `${MARKER}-cls-out`,
    });
    const okInbound = await classifyRpc({
      workspaceId: fx.workspaceA,
      messageId: inbound,
      conversationId: conv,
      intent: "needs_operator",
    });
    const badOutbound = await classifyRpc({
      workspaceId: fx.workspaceA,
      messageId: outbound,
      conversationId: conv,
      intent: "confirm",
    });
    if (!okInbound.error) pass("classify-inbound", "record_confirmation_classification accepts inbound");
    else fail("classify-inbound", rpcMessage(okInbound.error));
    if (rpcMessage(badOutbound.error).includes("classification_requires_inbound_message")) {
      pass("N", "outbound classification rejected");
    } else {
      fail("N", rpcMessage(badOutbound.error) || "expected classification_requires_inbound_message");
    }
  }

  // needs_operator without order
  {
    const conv = await createConversation({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      phone: "+91060000061",
      orderId: null,
    });
    const msg = await createMessage({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      conversationId: conv,
      direction: "inbound",
      externalId: `${MARKER}-cls-no-order`,
    });
    const { data, error } = await classifyRpc({
      workspaceId: fx.workspaceA,
      messageId: msg,
      conversationId: conv,
      intent: "needs_operator",
      orderUuid: null,
    });
    const row = (data as Array<Record<string, unknown>> | null)?.[0];
    if (!error && row?.inserted === true) {
      pass("K-live", "classification needs_operator without order_uuid");
    } else {
      fail("K-live", rpcMessage(error) || JSON.stringify(row));
    }
  }

  // whatsapp_auto evidence guards
  {
    const order = await createOrder(fx, fx.workspaceA, "Waiting", "gate-auto");
    const conv = await createConversation({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      phone: "+91060000071",
      orderId: order.id,
    });
    const inbound = await createMessage({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      conversationId: conv,
      orderId: order.id,
      direction: "inbound",
      externalId: `${MARKER}-auto-in`,
    });
    const outbound = await createMessage({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      conversationId: conv,
      orderId: order.id,
      direction: "outbound",
      externalId: `${MARKER}-auto-out`,
    });
    const convUnlinked = await createConversation({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      phone: "+91060000072",
      orderId: null,
    });
    const inboundUnlinked = await createMessage({
      workspaceId: fx.workspaceA,
      connectionId: fx.connectionA,
      conversationId: convUnlinked,
      direction: "inbound",
      externalId: `${MARKER}-auto-unlinked`,
    });

    const noEvidence = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "whatsapp_auto",
    });
    const outboundAuto = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "whatsapp_auto",
      conversationId: conv,
      messageId: outbound,
    });
    const unlinked = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "whatsapp_auto",
      conversationId: convUnlinked,
      messageId: inboundUnlinked,
    });
    const mismatch = await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "whatsapp_auto",
      conversationId: conv,
      messageId: inboundUnlinked,
    });

    if (rpcMessage(noEvidence.error).includes("whatsapp_auto_requires_inbound_evidence")) {
      pass("I-no-evidence", "whatsapp_auto without message/conversation denied");
    } else fail("I-no-evidence", rpcMessage(noEvidence.error));
    if (rpcMessage(outboundAuto.error).includes("whatsapp_auto_requires_inbound_message")) {
      pass("I-outbound-auto", "whatsapp_auto with outbound message denied");
    } else fail("I-outbound-auto", rpcMessage(outboundAuto.error));
    if (rpcMessage(unlinked.error).includes("conversation_not_linked_to_order")) {
      pass("I-unlinked-conv", "whatsapp_auto with conversation without order denied");
    } else fail("I-unlinked-conv", rpcMessage(unlinked.error));
    if (rpcMessage(mismatch.error).includes("message_conversation_mismatch")) {
      pass("I-mismatch", "message/conversation mismatch denied");
    } else fail("I-mismatch", rpcMessage(mismatch.error));
  }

  // Eligibility matrix
  {
    const cases: Array<[string, string, boolean]> = [
      ["Waiting", "gate-O-waiting", false],
      ["Cancelled", null, true],
      ["Delivered", null, true],
      ["Devolvido", null, true],
      ["Shipped", null, true],
      ["Enviado", null, true],
      ["Despachado", "Em transito", true],
    ];
    let allOk = true;
    for (const [status_name, details, denied] of cases) {
      const order = await createOrder(fx, fx.workspaceA, status_name, details);
      const { error } = await confirmRpc({
        workspaceId: fx.workspaceA,
        orderUuid: order.id,
        source: "operator",
        actorUserId: fx.userA.id,
      });
      const gotDenied = rpcMessage(error).includes("order_not_eligible");
      if (gotDenied !== denied) {
        allOk = false;
        fail(`O-${status_name}`, `expected denied=${denied}, error=${rpcMessage(error)}`);
      }
    }
    if (allOk) pass("O", "Waiting eligible; cancelled/delivered/returned/shipped/enviado/despachado denied");
  }

  // Default whatsapp_auto_confirm false
  {
    const { data } = await admin
      .from("workspaces")
      .select("whatsapp_auto_confirm")
      .eq("id", fx.workspaceA)
      .single();
    if (data?.whatsapp_auto_confirm === false) {
      pass("C-live", "whatsapp_auto_confirm remains false on fixture workspace");
    } else {
      fail("C-live", `expected false, got ${String(data?.whatsapp_auto_confirm)}`);
    }
  }

  // RLS — SELECT own workspace only on order_confirmation_events
  {
    const order = await createOrder(fx, fx.workspaceA, "Waiting", "gate-rls");
    await confirmRpc({
      workspaceId: fx.workspaceA,
      orderUuid: order.id,
      source: "operator",
      actorUserId: fx.userA.id,
    });
    const own = await clientA
      .from("order_confirmation_events")
      .select("id")
      .eq("workspace_id", fx.workspaceA);
    const foreign = await clientWithJwt(jwtB)
      .from("order_confirmation_events")
      .select("id")
      .eq("workspace_id", fx.workspaceA);
    const insertDenied = await clientA.from("order_confirmation_events").insert({
      workspace_id: fx.workspaceA,
      event_type: "order_confirmed",
      source: "operator",
      order_uuid: order.id,
      order_id: order.order_id,
    });
    const updateDenied = await clientA
      .from("order_confirmation_events")
      .update({ reason: "hack" })
      .eq("workspace_id", fx.workspaceA);
    const insertRls = rpcMessage(insertDenied.error).includes("row-level security");
    const updateBlocked =
      Boolean(updateDenied.error) ||
      rpcMessage(updateDenied.error).includes("row-level security") ||
      (updateDenied.count ?? 0) === 0;
    if ((own.data?.length ?? 0) > 0 && (foreign.data?.length ?? 0) === 0 && insertRls && updateBlocked) {
      pass("RLS-select", "authenticated SELECT own workspace only; INSERT/UPDATE blocked by RLS");
    } else {
      fail(
        "RLS-select",
        `own=${own.data?.length ?? 0} foreign=${foreign.data?.length ?? 0} insertRls=${insertRls} updateBlocked=${updateBlocked}`,
      );
    }
  }
}

async function main() {
  let fx: FixtureState | null = null;
  try {
    const probe = await admin.rpc("confirm_order_cod", {
      p_workspace_id: "00000000-0000-4000-8000-000000000001",
      p_order_uuid: "00000000-0000-4000-8000-000000000002",
      p_source: "operator",
      p_actor_user_id: null,
    });
    if (probe.error?.message?.includes("Could not find the function")) {
      throw new Error("confirm_order_cod missing — apply migration 20260828250000 first");
    }

    fx = await setupFixtures();
    await runLiveGates(fx);
  } catch (error) {
    fail("SETUP", error instanceof Error ? error.message : String(error));
  } finally {
    await cleanupFixtures();
  }

  console.log("\n--- Phase 6 POST-APPLY live summary ---");
  const failed = results.filter((r) => r.status === "FAIL");
  for (const row of results) {
    if (row.status === "FAIL") continue;
  }
  console.log(`${results.length - failed.length}/${results.length} PASS`);
  if (failed.length) {
    for (const row of failed) {
      console.error(`FAIL ${row.id}: ${row.detail}`);
    }
    process.exitCode = 1;
    console.error("\nPHASE 6 POST-APPLY GATE: FAIL — stop before Confirmation Engine");
    return;
  }
  console.log("\nPHASE 6 POST-APPLY GATE: PASS");
}

void main();
