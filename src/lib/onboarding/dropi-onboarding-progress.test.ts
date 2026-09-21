import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  authFromWebhookEndpointRow,
  webhookTokenFromRequest,
} from "@/lib/integrations/webhook-auth";
import {
  canProgressDropiOnboarding,
  copyDoesNotConnect,
  isDropiTechnicallyConnected,
} from "@/lib/onboarding/dropi-onboarding-progress";
import { mapDropiConnectionState, isConnectedState } from "@/lib/connections/connection-domain";

describe("Dropi webhook tenant resolution", () => {
  it("extracts opaque path token without exposing workspace ids", () => {
    const req = new Request(
      "https://app.example/api/public/webhooks/orders/elevate_wh_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    assert.equal(
      webhookTokenFromRequest(req),
      "elevate_wh_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
  });

  it("unknown/missing endpoint row rejects (no order writes)", () => {
    assert.deepEqual(authFromWebhookEndpointRow(null), {
      ok: false,
      workspaceId: null,
      supply: null,
    });
    assert.deepEqual(authFromWebhookEndpointRow(undefined), {
      ok: false,
      workspaceId: null,
      supply: null,
    });
  });

  it("token A resolves only to tenant A; token B only to tenant B", () => {
    const a = authFromWebhookEndpointRow({ workspace_id: "ws-tenant-a", supply: "dropi" });
    const b = authFromWebhookEndpointRow({ workspace_id: "ws-tenant-b", supply: "dropi" });
    assert.equal(a.ok, true);
    assert.equal(a.workspaceId, "ws-tenant-a");
    assert.equal(b.ok, true);
    assert.equal(b.workspaceId, "ws-tenant-b");
    assert.notEqual(a.workspaceId, b.workspaceId);
  });
});

describe("Dropi onboarding configured vs connected", () => {
  it("copying URL does not mark connected", () => {
    assert.equal(copyDoesNotConnect(), false);
    assert.equal(isConnectedState(mapDropiConnectionState("configured")), false);
  });

  it("checkbox configuredByUser allows progression without Connected", () => {
    assert.equal(
      canProgressDropiOnboarding({ backendStatus: "configured", configuredByUser: true }),
      true,
    );
    assert.equal(
      canProgressDropiOnboarding({ backendStatus: "not_configured", configuredByUser: true }),
      true,
    );
    assert.equal(
      canProgressDropiOnboarding({ backendStatus: "configured", configuredByUser: false }),
      false,
    );
    assert.equal(isDropiTechnicallyConnected("configured"), false);
  });

  it("first real backend connected status allows progression and is verified", () => {
    assert.equal(
      canProgressDropiOnboarding({ backendStatus: "connected", configuredByUser: false }),
      true,
    );
    assert.equal(isDropiTechnicallyConnected("connected"), true);
    assert.equal(isConnectedState(mapDropiConnectionState("connected")), true);
  });
});
