/**
 * Post-apply verify: legacy preserved + CHECK NOT VALID rejects new orphans.
 * Read/probe only — cleans any accidental probe rows.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(join(root, ".env"));
loadEnv(join(root, ".env.local"));

const url = process.env["SUPABASE_URL"]?.trim() || process.env["VITE_SUPABASE_URL"]?.trim();
const key =
  process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim() ||
  process.env["VITE_SUPABASE_SERVICE_ROLE_KEY"]?.trim();
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EXPECTED_OWNERLESS = [
  "0cfdb02c-02d4-4fb7-959c-22e1e7a3266b",
  "18bd9cd4-2da1-4a88-9b9d-5da7645800ce",
  "1d979bae-a97e-4202-b8ab-adcd6571f827",
].sort();

function isCheckReject(message: string, code?: string): boolean {
  const blob = `${code ?? ""} ${message}`;
  return /required_future|check constraint|violates check|23514/i.test(blob);
}

async function main() {
  const nullOrders = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .is("workspace_id", null);
  if (nullOrders.error) throw new Error(nullOrders.error.message);

  const ownerless = await admin.from("workspaces").select("id").is("owner_user_id", null);
  if (ownerless.error) throw new Error(ownerless.error.message);
  const ownerlessIds = (ownerless.data ?? []).map((r) => r.id).sort();

  console.log("LEGACY null orders:", nullOrders.count);
  console.log("LEGACY ownerless:", ownerlessIds);

  const legacyOk =
    nullOrders.count === 49 &&
    JSON.stringify(ownerlessIds) === JSON.stringify(EXPECTED_OWNERLESS);
  console.log("LEGACY PRESERVED:", legacyOk ? "YES" : "NO");

  // order_id is bigint in prod
  const probeOrderId = Number(`9${String(Date.now()).slice(-12)}`);
  const orderProbe = await admin
    .from("orders")
    .insert({
      order_id: probeOrderId,
      workspace_id: null,
      source: "Shopify",
      customer_name: "PROBE_DELETE_ME",
    })
    .select("id")
    .maybeSingle();

  if (orderProbe.error) {
    console.log(
      "NEW null-order INSERT:",
      isCheckReject(orderProbe.error.message, orderProbe.error.code)
        ? "REJECTED_BY_CHECK"
        : "REJECTED_OTHER",
      orderProbe.error.code,
      orderProbe.error.message,
    );
  } else {
    console.log("NEW null-order INSERT: ACCEPTED — CHECK MISSING");
    if (orderProbe.data?.id) {
      await admin.from("orders").delete().eq("id", orderProbe.data.id);
    } else {
      await admin.from("orders").delete().eq("order_id", probeOrderId);
    }
  }

  const wsProbe = await admin
    .from("workspaces")
    .insert({
      name: "PROBE_OWNERLESS_DELETE_ME",
      owner_user_id: null,
    })
    .select("id")
    .maybeSingle();

  if (wsProbe.error) {
    console.log(
      "NEW ownerless workspace INSERT:",
      isCheckReject(wsProbe.error.message, wsProbe.error.code)
        ? "REJECTED_BY_CHECK"
        : "REJECTED_OTHER",
      wsProbe.error.code,
      wsProbe.error.message,
    );
  } else {
    console.log("NEW ownerless workspace INSERT: ACCEPTED — CHECK MISSING");
    if (wsProbe.data?.id) {
      await admin.from("workspaces").delete().eq("id", wsProbe.data.id);
    }
  }

  const storeProbe = await admin
    .from("shopify_stores")
    .insert({
      shop_domain: `probe-${Date.now()}.myshopify.com`,
      workspace_id: null,
      access_token: "probe",
      user_id: "00000000-0000-4000-8000-000000000099",
    })
    .select("id")
    .maybeSingle();

  if (storeProbe.error) {
    console.log(
      "NEW null-workspace shopify_store INSERT:",
      isCheckReject(storeProbe.error.message, storeProbe.error.code)
        ? "REJECTED_BY_CHECK"
        : "REJECTED_OTHER",
      storeProbe.error.code,
      storeProbe.error.message,
    );
  } else {
    console.log("NEW null-workspace shopify_store INSERT: ACCEPTED — CHECK MISSING");
    if (storeProbe.data?.id) {
      await admin.from("shopify_stores").delete().eq("id", storeProbe.data.id);
    }
  }

  const eventProbe = await admin
    .from("order_events")
    .insert({
      order_id: probeOrderId,
      workspace_id: null,
      event_date: new Date().toISOString(),
      status_id: 0,
      status_name: "PROBE",
    })
    .select("id")
    .maybeSingle();

  if (eventProbe.error) {
    console.log(
      "NEW null-workspace order_event INSERT:",
      isCheckReject(eventProbe.error.message, eventProbe.error.code)
        ? "REJECTED_BY_CHECK"
        : "REJECTED_OTHER",
      eventProbe.error.code,
      eventProbe.error.message,
    );
  } else {
    console.log("NEW null-workspace order_event INSERT: ACCEPTED — CHECK MISSING");
    if (eventProbe.data?.id) {
      await admin.from("order_events").delete().eq("id", eventProbe.data.id);
    }
  }

  const afterNull = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .is("workspace_id", null);
  console.log("POST-PROBE null orders:", afterNull.count);

  const nullOrderBlocked =
    !!orderProbe.error && isCheckReject(orderProbe.error.message, orderProbe.error.code);
  const ownerlessBlocked =
    !!wsProbe.error && isCheckReject(wsProbe.error.message, wsProbe.error.code);
  const storeBlocked =
    !!storeProbe.error && isCheckReject(storeProbe.error.message, storeProbe.error.code);
  const eventsBlocked =
    !!eventProbe.error && isCheckReject(eventProbe.error.message, eventProbe.error.code);

  const allChecks =
    nullOrderBlocked && ownerlessBlocked && storeBlocked && eventsBlocked && legacyOk;

  console.log("\n=== SUMMARY ===");
  console.log("LEGACY BETA DATA PRESERVED:", legacyOk ? "YES" : "NO");
  console.log("NEW ORDERS CAN HAVE NULL WORKSPACE:", nullOrderBlocked ? "NO" : "YES");
  console.log("NEW EVENTS CAN HAVE NULL WORKSPACE:", eventsBlocked ? "NO" : "YES");
  console.log("NEW SHOPIFY STORE CAN HAVE NULL WORKSPACE:", storeBlocked ? "NO" : "YES");
  console.log("NEW CUSTOMER WORKSPACE CAN HAVE NULL OWNER:", ownerlessBlocked ? "NO" : "YES");
  console.log(
    "DATABASE FUTURE-OWNERSHIP ENFORCEMENT:",
    allChecks
      ? "APPLIED (CHECK NOT VALID — verified by probe)"
      : "INCOMPLETE / UNVERIFIED",
  );
  console.log("LAUNCH READINESS:", allChecks ? "READY (DB enforcement live)" : "PARTIAL");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
