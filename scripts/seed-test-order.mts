/**
 * Seed one test order for WhatsApp outbound/inbound testing.
 * Usage: npx tsx scripts/seed-test-order.mts [workspaceId]
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

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
loadEnv(join(root, ".env.local"));

const TEST_PHONE = process.env.TEST_CUSTOMER_PHONE?.trim() || "+351931815886";
const TEST_ORDER_ID = 9_991_042_082;

async function main() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let workspaceId = process.argv[2]?.trim();

  if (!workspaceId) {
    const { data: conn } = await supabase
      .from("whatsapp_connections")
      .select("workspace_id")
      .eq("provider", "whatsapp_web")
      .in("status", ["connected", "reconnecting"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    workspaceId = conn?.workspace_id ?? undefined;
  }

  if (!workspaceId) {
    const { data: ws } = await supabase
      .from("workspaces")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    workspaceId = ws?.id;
    if (ws) console.log(`Using workspace: ${ws.name ?? ws.id}`);
  }

  if (!workspaceId) {
    console.error("No workspace found. Pass workspace UUID as first argument.");
    process.exit(1);
  }

  const { data: linked } = await supabase
    .from("whatsapp_connections")
    .select("display_phone_number")
    .eq("workspace_id", workspaceId)
    .eq("provider", "whatsapp_web")
    .in("status", ["connected", "reconnecting"])
    .maybeSingle();

  if (linked?.display_phone_number && TEST_PHONE.replace(/\D/g, "") === linked.display_phone_number.replace(/\D/g, "")) {
    console.warn("");
    console.warn("⚠️  TEST_CUSTOMER_PHONE = número WhatsApp ligado.");
    console.warn("   A mensagem pode NÃO aparecer como SMS normal no telemóvel.");
    console.warn("   Para teste real: npx tsx scripts/seed-test-order.mts (depois de definir TEST_CUSTOMER_PHONE=+351XXXXXXXXX de OUTRO telefone).");
    console.warn("");
  }

  const now = new Date().toISOString();

  const { data: byOrderId } = await supabase
    .from("orders")
    .select("id, order_id, phone")
    .eq("order_id", TEST_ORDER_ID)
    .maybeSingle();

  if (byOrderId) {
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        workspace_id: workspaceId,
        phone: TEST_PHONE,
        customer_name: "Teste WhatsApp",
        status_name: "Waiting",
        details: "Pedido de teste WhatsApp — Fase 4/5",
        last_event_at: now,
      })
      .eq("id", byOrderId.id);

    if (updateError) {
      console.error("Update failed:", updateError.message);
      process.exit(1);
    }

    console.log("Test order updated:");
    console.log(`  UUID: ${byOrderId.id}`);
    console.log(`  order_id: ${byOrderId.order_id}`);
    console.log(`  phone: ${TEST_PHONE}`);
    console.log(`  Open: https://localhost:8081/orders/${byOrderId.order_id}`);
    return;
  }

  const { data: existing } = await supabase
    .from("orders")
    .select("id, order_id, phone")
    .eq("workspace_id", workspaceId)
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  if (existing) {
    console.log("Test order already exists:");
    console.log(`  UUID: ${existing.id}`);
    console.log(`  order_id: ${existing.order_id}`);
    console.log(`  phone: ${existing.phone}`);
    console.log(`  Open: /orders/${existing.order_id}`);
    return;
  }

  const { data: inserted, error } = await supabase
    .from("orders")
    .insert({
      workspace_id: workspaceId,
      order_id: TEST_ORDER_ID,
      shopify_order_id: null,
      status_id: 2,
      status_name: "Waiting",
      details: "Pedido de teste WhatsApp — Fase 4/5",
      tracking_code: null,
      tracking_url: null,
      shipping_company: null,
      total: 29.99,
      currency: "EUR",
      customer_name: "Teste WhatsApp",
      phone: TEST_PHONE,
      email: null,
      country: "PT",
      city: "Lisboa",
      source: "Dropi Pro",
      product_summary: "Produto teste ELEVATE",
      last_event_at: now,
    })
    .select("id, order_id, phone, customer_name, workspace_id")
    .single();

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      const { data: byNum } = await supabase
        .from("orders")
        .select("id, order_id, workspace_id, phone")
        .eq("order_id", TEST_ORDER_ID)
        .maybeSingle();
      if (byNum) {
        await supabase
          .from("orders")
          .update({
            workspace_id: workspaceId,
            phone: TEST_PHONE,
            customer_name: "Teste WhatsApp",
            status_name: "Waiting",
            details: "Pedido de teste WhatsApp — Fase 4/5",
            last_event_at: now,
          })
          .eq("id", byNum.id);
        console.log("Updated existing test order:");
        console.log(`  Open: /orders/${byNum.order_id}`);
        return;
      }
    }
    console.error("Insert failed:", error.message);
    process.exit(1);
  }

  console.log("Test order created:");
  console.log(`  UUID: ${inserted.id}`);
  console.log(`  Pedido: #${inserted.order_id}`);
  console.log(`  Cliente: ${inserted.customer_name}`);
  console.log(`  Telefone: ${inserted.phone}`);
  console.log(`  Workspace: ${inserted.workspace_id}`);
  console.log("");
  console.log(`Abrir: https://localhost:8081/orders/${inserted.order_id}`);
  console.log("");
  console.log("Próximo passo: WhatsApp ligado → Enviar mensagem → responder no telemóvel → ver Inbox.");
}

void main();
