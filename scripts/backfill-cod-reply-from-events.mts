/**
 * Backfill orders.cod_reply_* by replaying confirmation_classified events with merge rules.
 * Safe to re-run — only updates rows where cod_reply_intent IS NULL and not handled.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

import { mergeCodReplyOrderState } from "../src/lib/orders/merge-cod-reply-order-state.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv(join(root, ".env"));

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });

const { data: events, error } = await admin
  .from("order_confirmation_events")
  .select("workspace_id, order_uuid, intent, reason, created_at, message_id")
  .eq("event_type", "confirmation_classified")
  .not("order_uuid", "is", null)
  .not("intent", "is", null)
  .order("created_at", { ascending: true });

if (error) {
  console.error("fetch events failed", error.message);
  process.exit(1);
}

type EventRow = {
  workspace_id: string;
  order_uuid: string;
  intent: "confirm" | "reject" | "needs_operator";
  reason: string;
  created_at: string;
  message_id: string | null;
};

const byOrder = new Map<string, EventRow[]>();
for (const row of (events ?? []) as EventRow[]) {
  if (!row.order_uuid) continue;
  const list = byOrder.get(row.order_uuid) ?? [];
  list.push(row);
  byOrder.set(row.order_uuid, list);
}

let updated = 0;
let skipped = 0;

for (const [orderUuid, orderEvents] of byOrder) {
  const { data: order } = await admin
    .from("orders")
    .select("id, cod_reply_intent, cod_handled_at, workspace_id")
    .eq("id", orderUuid)
    .maybeSingle();

  if (!order || order.cod_reply_intent || order.cod_handled_at) {
    skipped++;
    continue;
  }

  let state: "confirm" | "reject" | "needs_operator" | null = null;
  let stateAt: string | null = null;
  let stateText: string | null = null;

  for (const ev of orderEvents) {
    const merge = mergeCodReplyOrderState({
      currentIntent: state,
      messageIntent: ev.intent,
      messageReason: ev.reason,
      isHandled: false,
    });
    if (merge.shouldUpdate && merge.nextIntent) {
      state = merge.nextIntent;
      stateAt = ev.created_at;
      if (ev.message_id) {
        const { data: msg } = await admin
          .from("whatsapp_messages")
          .select("message_body")
          .eq("id", ev.message_id)
          .eq("workspace_id", ev.workspace_id)
          .maybeSingle();
        stateText = msg?.message_body?.trim().slice(0, 500) ?? null;
      }
    }
  }

  if (!state || !stateAt) {
    skipped++;
    continue;
  }

  const { error: upErr } = await admin
    .from("orders")
    .update({
      cod_reply_intent: state,
      cod_reply_at: stateAt,
      cod_reply_text: stateText,
    })
    .eq("id", orderUuid)
    .eq("workspace_id", order.workspace_id)
    .is("cod_reply_intent", null)
    .is("cod_handled_at", null);

  if (upErr) {
    console.error("update failed", orderUuid, upErr.message);
    continue;
  }
  updated++;
  console.log("backfilled", orderUuid, state, stateText);
}

console.log(JSON.stringify({ updated, skipped, orders: byOrder.size }, null, 2));
