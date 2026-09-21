/**
 * Launch hardening contracts: legacy preserved, future ownership enforced.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("launch hardening: future ownership CHECK NOT VALID", () => {
  it("migration preserves legacy NULLs and rejects future orphans", () => {
    const sql = read(
      "supabase/migrations/20260920193000_future_ownership_check_not_valid.sql",
    );
    assert.match(sql, /orders_workspace_id_required_future/);
    assert.match(sql, /order_events_workspace_id_required_future/);
    assert.match(sql, /shopify_stores_workspace_id_required_future/);
    assert.match(sql, /workspaces_owner_user_id_required_future/);
    assert.match(sql, /CHECK \(workspace_id IS NOT NULL\) NOT VALID/);
    assert.match(sql, /CHECK \(owner_user_id IS NOT NULL\) NOT VALID/);
    // Header may mention VALIDATE CONSTRAINT as a warning; executable DDL must not run it.
    const executable = sql
      .replace(/--[^\n]*/g, "")
      .replace(/'[^']*'/g, "''");
    assert.doesNotMatch(executable, /\bVALIDATE\s+CONSTRAINT\b/i);
    assert.doesNotMatch(executable, /\bDELETE\s+FROM\b/i);
    assert.doesNotMatch(executable, /\bTRUNCATE\b/i);
  });
});

describe("launch hardening: new user ownership paths", () => {
  it("ensureOwnedWorkspace always inserts owner_user_id", () => {
    const src = read("src/lib/workspace/workspace.functions.ts");
    assert.match(src, /owner_user_id:\s*userId/);
    assert.match(src, /Never claims orphans|do not claim orphan/i);
    assert.match(src, /ensureInFlight/);
    assert.match(src, /pickOwnedWorkspace|selectExistingOwnedWorkspace/);
    assert.match(src, /isUniqueOwnerConflict/);
  });

  it("Shopify OAuth and persist require workspace", () => {
    const oauth = read("src/lib/integrations/shopify/oauth.functions.ts");
    const persist = read("src/lib/integrations/shopify/persist.ts");
    assert.match(oauth, /workspaceId:\s*z\.string\(\)\.uuid\(\),/);
    assert.match(oauth, /workspace_id:\s*cookie\.workspaceId/);
    assert.match(persist, /requireWorkspaceId/);
  });

  it("Dropi/Dropea event writes use status_id upsert sentinel", () => {
    assert.match(
      read("src/lib/integrations/shopify/persist.ts"),
      /eventStatusIdForUpsert/,
    );
    assert.match(
      read("src/lib/integrations/dropi/handle-public-orders-webhook.ts"),
      /eventStatusIdForUpsert/,
    );
    assert.match(
      read("src/lib/integrations/dropea/sync-dropea-orders.ts"),
      /eventStatusIdForUpsert/,
    );
  });

  it("Orders/Inbox/Profits query only authorized workspace ids", () => {
    assert.match(read("src/lib/synced-orders.functions.ts"), /authorizeWorkspaceInput/);
    assert.match(read("src/lib/inbox/inbox.functions.ts"), /\.eq\(\s*"workspace_id"/);
    assert.match(read("src/lib/profits.functions.ts"), /authorizeWorkspaceInput/);
  });

  it("Shopify dashboard scopes to authorized workspace when workspaceId provided", () => {
    const src = read("src/lib/integrations/shopify/shopify.functions.ts");
    assert.match(src, /getShopifyDashboard/);
    assert.match(src, /workspaceId:\s*z\.string\(\)\.uuid\(\)/);
    assert.match(src, /authorizeWorkspaceInput/);
    const route = read("src/routes/connections.shopify.tsx");
    assert.match(route, /shopifyDashboardQuery\(workspaceId\)/);
    assert.match(route, /getShopifyDashboard\(\{\s*data:/);
  });

  it("Shopify oauth status/disconnect/sync require workspaceId", () => {
    const oauth = read("src/lib/integrations/shopify/oauth.functions.ts");
    assert.match(oauth, /export const getShopifyOauthStatus[\s\S]*?workspaceId:\s*z\.string\(\)\.uuid\(\)/);
    assert.match(oauth, /export const disconnectShopifyStore[\s\S]*?workspaceId:\s*z\.string\(\)\.uuid\(\)/);
    assert.match(oauth, /export const syncConnectedShopifyStore[\s\S]*?workspaceId:\s*z\.string\(\)\.uuid\(\)/);
    assert.doesNotMatch(
      oauth.slice(oauth.indexOf("export const disconnectShopifyStore")),
      /workspaceId:\s*z\.string\(\)\.uuid\(\)\.optional\(\)/,
    );
  });
});

describe("launch hardening: A/B isolation contract", () => {
  it("same external order_id may coexist across workspaces", () => {
    const migration = read(
      "supabase/migrations/20260920190000_orders_workspace_scoped_identity.sql",
    );
    assert.match(migration, /orders_workspace_order_id_uidx/);
    assert.match(migration, /\(workspace_id, order_id\)/);
  });
});
