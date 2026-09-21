/**
 * Multi-tenant readiness contracts (audit).
 * These assert isolation helpers and known server-boundary patterns.
 * They do not connect to production Supabase.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  allowsSameExternalOrderIdAcrossWorkspaces,
  collectCrossWorkspaceOrderCollisions,
} from "@/lib/orders/cross-workspace-order-collision";
import {
  authFromWebhookEndpointRow,
  webhookTokenFromRequest,
} from "@/lib/integrations/webhook-auth";
import { isOpaqueWebhookToken, randomWebhookToken } from "@/lib/integrations/webhook-token";
import { WorkspaceAccessError } from "@/lib/workspace/require-workspace-access";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("multi-tenant: Dropi webhook identity", () => {
  it("each tenant gets a distinct opaque token shape", () => {
    const a = randomWebhookToken();
    const b = randomWebhookToken();
    assert.notEqual(a, b);
    assert.equal(isOpaqueWebhookToken(a), true);
    assert.equal(isOpaqueWebhookToken(b), true);
  });

  it("token A resolves only to workspace A", () => {
    const a = authFromWebhookEndpointRow({ workspace_id: "ws-a", supply: "dropi" });
    const b = authFromWebhookEndpointRow({ workspace_id: "ws-b", supply: "dropi" });
    assert.equal(a.workspaceId, "ws-a");
    assert.equal(b.workspaceId, "ws-b");
    assert.equal(authFromWebhookEndpointRow(null).ok, false);
  });

  it("path token extraction does not embed user ids", () => {
    const token = randomWebhookToken();
    const req = new Request(`https://app.example/api/public/webhooks/orders/${token}`);
    assert.equal(webhookTokenFromRequest(req), token);
    assert.doesNotMatch(token, /[0-9a-f]{8}-[0-9a-f]{4}-/);
  });
});

describe("multi-tenant: orders cross-workspace collision", () => {
  it("same external order_id may coexist across workspaces after composite unique", () => {
    assert.equal(allowsSameExternalOrderIdAcrossWorkspaces(), true);
    const blocked = collectCrossWorkspaceOrderCollisions(
      [
        { order_id: 12345, workspace_id: "tenant-a" },
        { order_id: 12345, workspace_id: "tenant-b" },
      ],
      "tenant-a",
    );
    assert.equal(blocked.size, 0);
  });
});

describe("multi-tenant: workspace authorization contract", () => {
  it("foreign workspace access is forbidden (error taxonomy)", () => {
    const err = new WorkspaceAccessError("forbidden", "Workspace access denied.");
    assert.equal(err.code, "forbidden");
  });
});

describe("multi-tenant: server query boundary contracts (source)", () => {
  it("Orders list requires authorizeWorkspaceInput + workspace_id filter", () => {
    const src = readSrc("src/lib/synced-orders.functions.ts");
    assert.match(src, /authorizeWorkspaceInput/);
    assert.match(src, /\.eq\(\s*"workspace_id"/);
  });

  it("Profits requires authorizeWorkspaceInput + workspace_id filter", () => {
    const src = readSrc("src/lib/profits.functions.ts");
    assert.match(src, /authorizeWorkspaceInput/);
    assert.match(src, /\.eq\(\s*"workspace_id"/);
  });

  it("Dropea sync authorizes workspace before credential load", () => {
    const src = readSrc("src/lib/integrations/dropea/sync-dropea-orders.ts");
    assert.match(src, /authorizeWorkspaceInput/);
    assert.match(src, /loadDropeaApiToken\(workspaceId\)/);
    assert.match(src, /\.eq\(\s*"workspace_id",\s*workspaceId/);
    assert.match(src, /onConflict:\s*"workspace_id,order_id"/);
  });

  it("Dropi webhook handler rejects unauthorized tokens before writes", () => {
    const src = readSrc("src/lib/integrations/dropi/handle-public-orders-webhook.ts");
    assert.match(src, /resolvePublicWebhookAuth/);
    assert.match(src, /Unauthorized/);
    assert.match(src, /workspace_id: workspaceId/);
    assert.match(src, /\.eq\(\s*"workspace_id",\s*workspaceId/);
    assert.match(src, /onConflict:\s*"workspace_id,order_id"/);
  });

  it("WhatsApp gateway sessions are keyed per connectionId with ownership assert", () => {
    const sessions = readSrc("services/whatsapp-gateway/src/routes/sessions.ts");
    assert.match(sessions, /assertConnectionOwnership/);
    assert.match(sessions, /claims\.workspace_id/);
    const manager = readSrc("services/whatsapp-gateway/src/session-manager.ts");
    assert.match(manager, /Map<string, LiveSession>/);
    assert.match(manager, /workspaceId/);
  });

  it("flags Shopify persist as workspace-scoped after P0", () => {
    const persist = readSrc("src/lib/integrations/shopify/persist.ts");
    assert.match(persist, /onConflict:\s*"workspace_id,order_id"/);
    assert.match(persist, /requireWorkspaceId/);
    assert.doesNotMatch(persist, /onConflict:\s*"order_id"/);
  });

  it("Orders enrichment never uses unscoped Shopify store fallback", () => {
    const orders = readSrc("src/lib/synced-orders.functions.ts");
    assert.match(orders, /Never fall back to another tenant/);
    assert.match(
      orders,
      /\.from\(\s*"shopify_stores"\s*\)[\s\S]*?\.eq\(\s*"workspace_id",\s*workspaceId\)[\s\S]*?\.maybeSingle\(\)/,
    );
  });
});
