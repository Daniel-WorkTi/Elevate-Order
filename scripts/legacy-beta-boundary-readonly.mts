/**
 * READ-ONLY: legacy beta boundary + ownership signal report.
 * No PII in output (no names/emails/phones).
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const MULTITENANT_MIGRATION_AT = "2026-08-27T00:00:00.000Z"; // 20260827190000_workspaces_multitenant
const P0_IDENTITY_AT = "2026-09-20T00:00:00.000Z";

const LEGACY_WS = [
  "0cfdb02c-02d4-4fb7-959c-22e1e7a3266b",
  "18bd9cd4-2da1-4a88-9b9d-5da7645800ce",
  "1d979bae-a97e-4202-b8ab-adcd6571f827",
] as const;

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) throw new Error("Missing env");

const sb = createClient(url, key, { auth: { persistSession: false } });

function minMax(dates: string[]) {
  if (!dates.length) return { min: null as string | null, max: null as string | null };
  const sorted = [...dates].sort();
  return { min: sorted[0]!, max: sorted[sorted.length - 1]! };
}

async function main() {
  console.log("=== LEGACY BETA BOUNDARY (read-only, no PII) ===\n");
  console.log("multitenant_migration_anchor:", MULTITENANT_MIGRATION_AT);
  console.log("p0_identity_anchor:", P0_IDENTITY_AT);

  const { data: nullOrders, error: oErr } = await sb
    .from("orders")
    .select("id, order_id, source, created_at, updated_at, shopify_order_id")
    .is("workspace_id", null);
  if (oErr) throw new Error(oErr.message);

  const orderDates = (nullOrders ?? [])
    .map((o) => o.created_at as string)
    .filter(Boolean);
  const orderRange = minMax(orderDates);
  const beforeMt = orderDates.filter((d) => d < MULTITENANT_MIGRATION_AT).length;
  const between = orderDates.filter(
    (d) => d >= MULTITENANT_MIGRATION_AT && d < P0_IDENTITY_AT,
  ).length;
  const afterP0 = orderDates.filter((d) => d >= P0_IDENTITY_AT).length;

  console.log("\n49 NULL-workspace orders:");
  console.log(
    JSON.stringify({
      count: nullOrders?.length ?? 0,
      created_at_min: orderRange.min,
      created_at_max: orderRange.max,
      created_before_multitenant: beforeMt,
      created_between_mt_and_p0: between,
      created_on_or_after_p0: afterP0,
      sources: [...new Set((nullOrders ?? []).map((o) => o.source))],
      classification: "PRESERVE_LEGACY",
    }),
  );

  console.log("\n3 ownerless UNKNOWN workspaces:");
  for (const id of LEGACY_WS) {
    const { data: ws } = await sb
      .from("workspaces")
      .select("id, created_at, updated_at, owner_user_id")
      .eq("id", id)
      .maybeSingle();
    const [{ count: orders }, { count: events }, { count: webhooks }, { count: wa }] =
      await Promise.all([
        sb.from("orders").select("*", { count: "exact", head: true }).eq("workspace_id", id),
        sb.from("order_events").select("*", { count: "exact", head: true }).eq("workspace_id", id),
        sb
          .from("workspace_webhook_endpoints")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", id),
        sb
          .from("whatsapp_connections")
          .select("*", { count: "exact", head: true })
          .eq("workspace_id", id),
      ]);
    const { data: wh } = await sb
      .from("workspace_webhook_endpoints")
      .select("id, supply, created_at")
      .eq("workspace_id", id);
    console.log(
      JSON.stringify({
        id,
        owner_user_id: ws?.owner_user_id ?? null,
        created_at: ws?.created_at ?? null,
        updated_at: ws?.updated_at ?? null,
        orders: orders ?? 0,
        events: events ?? 0,
        webhooks: webhooks ?? 0,
        whatsapp: wa ?? 0,
        webhook_created: (wh ?? []).map((w) => ({
          supply: w.supply,
          created_at: w.created_at,
        })),
        classification: "PRESERVE_LEGACY",
        pre_hardening_plausible:
          Boolean(ws?.created_at) &&
          String(ws?.created_at) < P0_IDENTITY_AT,
      }),
    );
  }

  // Beta user mapping — strong evidence only (no PII)
  console.log("\nBETA USER MAPPING (no PII):");
  const mappings: Array<{
    workspace_id: string;
    user_id: string | null;
    confidence: "CONFIRMED" | "LIKELY" | "UNKNOWN";
    evidence: string;
  }> = [];

  for (const id of LEGACY_WS) {
    // Strong: shopify_stores.user_id with same workspace_id
    const { data: stores } = await sb
      .from("shopify_stores")
      .select("user_id, workspace_id")
      .eq("workspace_id", id);
    const storeUsers = [
      ...new Set(
        (stores ?? [])
          .map((s) => s.user_id as string | null)
          .filter((u): u is string => Boolean(u)),
      ),
    ];
    if (storeUsers.length === 1) {
      mappings.push({
        workspace_id: id,
        user_id: storeUsers[0]!,
        confidence: "CONFIRMED",
        evidence: "shopify_stores.user_id uniquely bound to this workspace_id",
      });
      continue;
    }

    // Strong: whatsapp_connections created under workspace with no other owners
    // (connection itself has no user_id in types for web — skip weak)

    // LIKELY: only one auth user created near workspace created_at (±1 day) AND no other owned workspace
    // Too weak without more signals — leave UNKNOWN
    mappings.push({
      workspace_id: id,
      user_id: null,
      confidence: "UNKNOWN",
      evidence: "owner_user_id NULL; no unique shopify user binding; do not infer",
    });
  }

  for (const m of mappings) console.log(JSON.stringify(m));

  // Auth users who own a workspace today
  const { data: owned } = await sb
    .from("workspaces")
    .select("id, owner_user_id, created_at")
    .not("owner_user_id", "is", null);
  console.log("\nOwned workspaces count:", owned?.length ?? 0);

  const outDir = resolve(process.cwd(), "docs/audit");
  mkdirSync(outDir, { recursive: true });
  const out = {
    generated_at: new Date().toISOString(),
    anchors: { MULTITENANT_MIGRATION_AT, P0_IDENTITY_AT },
    nullOrders: {
      count: nullOrders?.length ?? 0,
      created_at_min: orderRange.min,
      created_at_max: orderRange.max,
      beforeMt,
      between,
      afterP0,
      classification: "PRESERVE_LEGACY",
    },
    ownerlessWorkspaces: LEGACY_WS,
    mappings,
  };
  writeFileSync(resolve(outDir, "legacy-beta-boundary.json"), JSON.stringify(out, null, 2));
  console.log("\nWrote docs/audit/legacy-beta-boundary.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
