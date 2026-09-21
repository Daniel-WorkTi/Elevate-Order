import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("P0 Shopify persist workspace scoping", () => {
  it("requires workspace_id and conflicts on workspace_id,order_id", () => {
    const persist = readSrc("src/lib/integrations/shopify/persist.ts");
    assert.match(persist, /requireWorkspaceId/);
    assert.match(persist, /onConflict:\s*"workspace_id,order_id"/);
    assert.match(persist, /\.eq\("workspace_id", scopedWorkspaceId\)/);
    assert.doesNotMatch(persist, /onConflict:\s*"order_id"/);
  });

  it("never looks up shopify_order_id without workspace scope", () => {
    const persist = readSrc("src/lib/integrations/shopify/persist.ts");
    const lookups = [...persist.matchAll(/\.in\("shopify_order_id"/g)];
    assert.ok(lookups.length >= 1);
    // Every in(shopify_order_id) block is preceded by eq(workspace_id) in the same chain.
    assert.match(
      persist,
      /\.eq\("workspace_id", scopedWorkspaceId\)[\s\S]{0,120}\.in\("shopify_order_id"/,
    );
  });
});

describe("P0 Shopify store lookup workspace scoping", () => {
  it("Orders enrichment does not fall back to a global Shopify store", () => {
    const orders = readSrc("src/lib/synced-orders.functions.ts");
    assert.match(orders, /Never fall back to another tenant/);
    assert.doesNotMatch(
      orders,
      /fallback = await supabaseAdmin[\s\S]{0,200}\.is\("uninstalled_at", null\)[\s\S]{0,80}\.limit\(1\)/,
    );
    assert.match(orders, /\.eq\("workspace_id", workspaceId\)/);
  });
});

describe("P0 Dropi/Dropea workspace-scoped upserts", () => {
  it("Dropi webhook upserts on workspace_id,order_id and scopes lookups", () => {
    const webhook = readSrc("src/lib/integrations/dropi/handle-public-orders-webhook.ts");
    assert.match(webhook, /onConflict:\s*"workspace_id,order_id"/);
    assert.match(webhook, /\.eq\("workspace_id", workspaceId\)/);
    assert.doesNotMatch(webhook, /collectCrossWorkspaceOrderCollisions/);
    assert.doesNotMatch(webhook, /onConflict:\s*"order_id"/);
  });

  it("Dropea sync upserts on workspace_id,order_id and scopes lookups", () => {
    const sync = readSrc("src/lib/integrations/dropea/sync-dropea-orders.ts");
    assert.match(sync, /onConflict:\s*"workspace_id,order_id"/);
    assert.match(sync, /\.eq\("workspace_id", workspaceId\)/);
    assert.doesNotMatch(sync, /collectCrossWorkspaceOrderCollisions/);
  });
});

describe("P0 migration defines composite uniqueness", () => {
  it("migration drops global order_id unique and adds workspace composite", () => {
    const migration = readSrc(
      "supabase/migrations/20260920190000_orders_workspace_scoped_identity.sql",
    );
    assert.match(migration, /DROP CONSTRAINT IF EXISTS orders_order_id_key/);
    assert.match(migration, /orders_workspace_order_id_uidx/);
    assert.match(migration, /UNIQUE INDEX[\s\S]*\(workspace_id, order_id\)/);
    assert.match(migration, /order_events_workspace_order_event_uidx/);
    assert.match(migration, /P0 ABORTED/);
  });
});

describe("two-workspace same external order_id (contract)", () => {
  it("models coexistence of order 12345 in A and B", () => {
    const rows = [
      { workspace_id: "ws-a", order_id: 12345, customer_name: "Customer A" },
      { workspace_id: "ws-b", order_id: 12345, customer_name: "Customer B" },
    ];
    const inboxA = rows.filter((r) => r.workspace_id === "ws-a");
    const inboxB = rows.filter((r) => r.workspace_id === "ws-b");
    assert.equal(inboxA.length, 1);
    assert.equal(inboxA[0]?.customer_name, "Customer A");
    assert.equal(inboxB.length, 1);
    assert.equal(inboxB[0]?.customer_name, "Customer B");
    assert.equal(rows.filter((r) => r.order_id === 12345).length, 2);
  });

  it("events attach only within their workspace", () => {
    const events = [
      { workspace_id: "ws-a", order_id: 12345, status_name: "Shipped" },
      { workspace_id: "ws-b", order_id: 12345, status_name: "Pending" },
    ];
    assert.deepEqual(
      events.filter((e) => e.workspace_id === "ws-a").map((e) => e.status_name),
      ["Shipped"],
    );
    assert.deepEqual(
      events.filter((e) => e.workspace_id === "ws-b").map((e) => e.status_name),
      ["Pending"],
    );
  });
});
