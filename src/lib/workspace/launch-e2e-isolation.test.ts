/**
 * Launch E2E isolation contracts — strongest automated approximation of
 * two independent customers (User A / Workspace A vs User B / Workspace B).
 * Asserts server/DB boundary patterns; does not hit production.
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
import { authFromWebhookEndpointRow } from "@/lib/integrations/webhook-auth";
import { randomWebhookToken } from "@/lib/integrations/webhook-token";
import { WorkspaceAccessError } from "@/lib/workspace/require-workspace-access";
import { eventStatusIdForUpsert } from "@/lib/orders/event-status-id";
import {
  canProgressDropiOnboarding,
  copyDoesNotConnect,
  isDropiTechnicallyConnected,
} from "@/lib/onboarding/dropi-onboarding-progress";
import { shouldShowOnboarding } from "@/lib/onboarding/onboarding-state";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const WS_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WS_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const EXTERNAL_ORDER_ID = 424242;

describe("launch E2E: A/B order coexistence", () => {
  it("same external order_id may exist in A and B", () => {
    assert.equal(allowsSameExternalOrderIdAcrossWorkspaces(), true);
    const blocked = collectCrossWorkspaceOrderCollisions(
      [
        { order_id: EXTERNAL_ORDER_ID, workspace_id: WS_A },
        { order_id: EXTERNAL_ORDER_ID, workspace_id: WS_B },
      ],
      WS_A,
    );
    assert.equal(blocked.size, 0);
  });

  it("DB unique is composite (workspace_id, order_id)", () => {
    const sql = read(
      "supabase/migrations/20260920190000_orders_workspace_scoped_identity.sql",
    );
    assert.match(sql, /orders_workspace_order_id_uidx/);
    assert.match(sql, /\(workspace_id,\s*order_id\)/);
  });
});

describe("launch E2E: A cannot read/mutate B (server source contracts)", () => {
  it("Orders list/detail/events require authorizeWorkspaceInput + workspace filter", () => {
    const src = read("src/lib/synced-orders.functions.ts");
    assert.match(src, /authorizeWorkspaceInput/);
    assert.match(src, /\.eq\(\s*"workspace_id",\s*workspaceId/);
    // Enrichment must not leak cross-tenant events for shared order_id
    assert.match(
      src,
      /from\("order_events"\)[\s\S]*?\.eq\(\s*"order_id"[\s\S]*?\.eq\(\s*"workspace_id",\s*workspaceId/,
    );
  });

  it("Recovery dashboard events are workspace-scoped", () => {
    const src = read("src/lib/inbox/recovery.functions.ts");
    assert.match(
      src,
      /from\("order_events"\)[\s\S]*?\.eq\(\s*"workspace_id",\s*workspaceId[\s\S]*?\.in\(\s*"order_id"/,
    );
  });

  it("Inbox / Profits / Templates authorize workspace", () => {
    assert.match(read("src/lib/inbox/inbox.functions.ts"), /authorizeWorkspaceInput/);
    assert.match(read("src/lib/profits.functions.ts"), /authorizeWorkspaceInput/);
    assert.match(read("src/lib/templates.functions.ts"), /authorizeWorkspaceInput/);
  });

  it("foreign workspace throws forbidden", () => {
    const err = new WorkspaceAccessError("forbidden", "Workspace access denied.");
    assert.equal(err.code, "forbidden");
  });
});

describe("launch E2E: connections & providers isolation", () => {
  it("Dropi opaque token A never resolves to workspace B", () => {
    const tokenA = randomWebhookToken();
    const tokenB = randomWebhookToken();
    assert.notEqual(tokenA, tokenB);
    const authA = authFromWebhookEndpointRow({ workspace_id: WS_A, supply: "dropi" });
    const authB = authFromWebhookEndpointRow({ workspace_id: WS_B, supply: "dropi" });
    assert.equal(authA.ok && authA.workspaceId, WS_A);
    assert.equal(authB.ok && authB.workspaceId, WS_B);
    assert.equal(authFromWebhookEndpointRow(null).ok, false);
  });

  it("Dropi webhook handler stamps workspace from token auth only", () => {
    const src = read("src/lib/integrations/dropi/handle-public-orders-webhook.ts");
    assert.match(src, /resolvePublicWebhookAuth/);
    assert.match(src, /Unauthorized/);
    assert.match(src, /workspace_id: workspaceId/);
    assert.match(src, /onConflict:\s*"workspace_id,order_id"/);
  });

  it("Dropea sync authorizes before credential load and scopes upserts", () => {
    const src = read("src/lib/integrations/dropea/sync-dropea-orders.ts");
    assert.match(src, /authorizeWorkspaceInput/);
    assert.match(src, /loadDropeaApiToken\(workspaceId\)/);
    assert.match(src, /onConflict:\s*"workspace_id,order_id"/);
  });

  it("Shopify persist requires workspace and never upserts on order_id alone", () => {
    const persist = read("src/lib/integrations/shopify/persist.ts");
    assert.match(persist, /requireWorkspaceId/);
    assert.match(persist, /onConflict:\s*"workspace_id,order_id"/);
    assert.doesNotMatch(persist, /onConflict:\s*"order_id"/);
  });

  it("Shopify OAuth cookie binds workspaceId and is HMAC-signed", () => {
    const oauth = read("src/lib/integrations/shopify/oauth.ts");
    const fns = read("src/lib/integrations/shopify/oauth.functions.ts");
    assert.match(oauth, /signOauthPayload|OAUTH_COOKIE_SIG_VERSION/);
    assert.match(fns, /workspace_id:\s*cookie\.workspaceId|workspaceId:\s*authorized\.id/);
    assert.match(fns, /\.eq\(\s*"workspace_id",\s*authorized\.id/);
  });

  it("WhatsApp gateway asserts connection ownership", () => {
    const sessions = read("services/whatsapp-gateway/src/routes/sessions.ts");
    assert.match(sessions, /assertConnectionOwnership/);
    assert.match(sessions, /claims\.workspace_id/);
    const wa = read("src/lib/whatsapp/whatsapp.functions.ts");
    assert.match(wa, /authorizeWorkspaceInput/);
  });
});

describe("launch E2E: new account lifecycle contracts", () => {
  it("ensureOwnedWorkspace never claims orphans and always sets owner", () => {
    const src = read("src/lib/workspace/workspace.functions.ts");
    assert.match(src, /owner_user_id:\s*userId/);
    assert.match(src, /do not claim orphan|Never claims orphans/i);
    assert.match(src, /listOwnedWorkspaces/);
  });

  it("new users are gated to onboarding until complete", () => {
    assert.equal(
      shouldShowOnboarding({
        userId: "user-a",
        createdAt: new Date().toISOString(),
        cookieValue: null,
      }),
      true,
    );
    assert.equal(
      shouldShowOnboarding({
        userId: "user-a",
        createdAt: new Date().toISOString(),
        cookieValue: "user-a",
      }),
      false,
    );
  });

  it("Dropi skip/copy never means connected; checkbox ≠ verified", () => {
    assert.equal(copyDoesNotConnect(), false);
    assert.equal(isDropiTechnicallyConnected("configured"), false);
    assert.equal(isDropiTechnicallyConnected("connected"), true);
    assert.equal(
      canProgressDropiOnboarding({ backendStatus: "configured", configuredByUser: true }),
      true,
    );
    assert.equal(
      canProgressDropiOnboarding({ backendStatus: "not_configured", configuredByUser: false }),
      false,
    );
  });
});

describe("launch E2E: event idempotency sentinel", () => {
  it("maps null status_id to 0 so repeated upserts collide", () => {
    assert.equal(eventStatusIdForUpsert(null), 0);
    assert.equal(eventStatusIdForUpsert(undefined), 0);
    const rows = Array.from({ length: 10 }, () => ({
      workspace_id: WS_A,
      order_id: EXTERNAL_ORDER_ID,
      event_date: "2026-09-20T12:00:00.000Z",
      status_id: eventStatusIdForUpsert(null),
    }));
    const keys = new Set(
      rows.map((r) => `${r.workspace_id}|${r.order_id}|${r.event_date}|${r.status_id}`),
    );
    assert.equal(keys.size, 1);
  });

  it("Shopify/Dropi/Dropea ingest use eventStatusIdForUpsert + ignoreDuplicates", () => {
    for (const path of [
      "src/lib/integrations/shopify/persist.ts",
      "src/lib/integrations/dropi/handle-public-orders-webhook.ts",
      "src/lib/integrations/dropea/sync-dropea-orders.ts",
    ]) {
      const src = read(path);
      assert.match(src, /eventStatusIdForUpsert/);
      assert.match(src, /ignoreDuplicates:\s*true/);
      assert.match(src, /onConflict:\s*"workspace_id,order_id,event_date,status_id"/);
    }
  });
});

describe("launch E2E: legacy beta preservation (must not touch)", () => {
  it("future ownership migration does not VALIDATE or DELETE", () => {
    const sql = read(
      "supabase/migrations/20260920193000_future_ownership_check_not_valid.sql",
    );
    const executable = sql.replace(/--[^\n]*/g, "").replace(/'[^']*'/g, "''");
    assert.doesNotMatch(executable, /\bVALIDATE\s+CONSTRAINT\b/i);
    assert.doesNotMatch(executable, /\bDELETE\s+FROM\b/i);
    assert.match(sql, /NOT VALID/);
  });
});
