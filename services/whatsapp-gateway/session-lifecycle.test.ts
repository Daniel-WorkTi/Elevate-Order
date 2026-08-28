import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { randomBytes } from "node:crypto";

import { SessionManager } from "./src/session-manager.ts";
import type { GatewayConfig } from "./src/config.ts";

function testConfig(): GatewayConfig {
  return {
    port: 8787,
    supabaseUrl: "https://example.supabase.co",
    supabaseServiceRoleKey: "service-role-test",
    gatewayInternalSecret: randomBytes(32).toString("base64url"),
    sessionEncryptionKeyBase64: randomBytes(32).toString("base64"),
  };
}

describe("session-manager lifecycle", () => {
  it("returns disconnected for unknown connection", () => {
    const manager = new SessionManager(testConfig());
    const status = manager.getPublicStatus("00000000-0000-0000-0000-000000000000");
    assert.equal(status.status, "disconnected");
    assert.equal(status.qr, null);
  });

  it("shutdownAll preserves sessions without throwing", async () => {
    const manager = new SessionManager(testConfig());
    await manager.shutdownAll();
    const status = manager.getPublicStatus("00000000-0000-0000-0000-000000000000");
    assert.equal(status.status, "disconnected");
  });
});
