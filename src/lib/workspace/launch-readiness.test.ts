/**
 * Launch readiness regression contracts (source + helpers).
 * No production DB writes.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("launch: Shopify OAuth requires workspace", () => {
  it("start install schema requires workspaceId uuid", () => {
    const src = readSrc("src/lib/integrations/shopify/oauth.functions.ts");
    const shopInput = src.slice(src.indexOf("const shopInput"), src.indexOf("const WEBHOOK_TOPICS"));
    assert.match(shopInput, /workspaceId:\s*z\.string\(\)\.uuid\(\),/);
    assert.doesNotMatch(shopInput, /workspaceId:\s*z\.string\(\)\.uuid\(\)\.optional\(\)/);
  });

  it("complete install always persists workspace_id", () => {
    const src = readSrc("src/lib/integrations/shopify/oauth.functions.ts");
    assert.match(src, /workspace_id:\s*cookie\.workspaceId/);
    assert.match(src, /Shopify OAuth requires a workspace/);
    assert.doesNotMatch(
      src,
      /\.\.\.\(cookie\.workspaceId\s*\?\s*\{\s*workspace_id/,
    );
  });
});

describe("launch: onboarding workspace ownership", () => {
  it("ensureDefaultWorkspace inserts owner_user_id", () => {
    const src = readSrc("src/lib/workspace/workspace.functions.ts");
    assert.match(src, /owner_user_id:\s*userId/);
    assert.match(src, /ensureDefaultWorkspace/);
  });
});

describe("launch: tenant isolation contracts", () => {
  it("Dropi webhook resolves opaque token to one workspace", () => {
    const src = readSrc("src/lib/integrations/dropi/handle-public-orders-webhook.ts");
    assert.match(src, /resolvePublicWebhookAuth/);
    assert.match(src, /\.eq\(\s*"workspace_id",\s*workspaceId/);
    assert.match(src, /onConflict:\s*"workspace_id,order_id"/);
  });

  it("Dropea sync authorizes then scopes all writes", () => {
    const src = readSrc("src/lib/integrations/dropea/sync-dropea-orders.ts");
    assert.match(src, /authorizeWorkspaceInput/);
    assert.match(src, /onConflict:\s*"workspace_id,order_id"/);
  });

  it("Shopify persist rejects missing workspace", () => {
    const src = readSrc("src/lib/integrations/shopify/persist.ts");
    assert.match(src, /requireWorkspaceId/);
  });

  it("WhatsApp gateway asserts connection ownership", () => {
    const sessions = readSrc("services/whatsapp-gateway/src/routes/sessions.ts");
    assert.match(sessions, /assertConnectionOwnership/);
  });

  it("Profits and Orders filter by authorized workspace", () => {
    assert.match(readSrc("src/lib/profits.functions.ts"), /authorizeWorkspaceInput/);
    assert.match(readSrc("src/lib/synced-orders.functions.ts"), /authorizeWorkspaceInput/);
    assert.match(readSrc("src/lib/templates.functions.ts"), /authorizeWorkspaceInput/);
  });
});

describe("launch: no global webhook token in client-facing builders", () => {
  it("buildWebhookRelativeUrl does not interpolate ELEVATE_WEBHOOK_TOKEN", () => {
    const src = readSrc("src/lib/integrations/webhook-auth.ts");
    const fn = src.slice(src.indexOf("function buildWebhookRelativeUrl"));
    const body = fn.slice(0, fn.indexOf("\nexport ") > 0 ? fn.indexOf("\nexport ") : 400);
    assert.doesNotMatch(body, /ELEVATE_WEBHOOK_TOKEN/);
  });
});
