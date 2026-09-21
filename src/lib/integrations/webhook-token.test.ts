import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isOpaqueWebhookToken,
  randomWebhookToken,
} from "@/lib/integrations/webhook-token";

describe("Dropi webhook token generation", () => {
  it("creates opaque elevate_wh_ tokens (no user/workspace id)", () => {
    const token = randomWebhookToken();
    assert.equal(isOpaqueWebhookToken(token), true);
    assert.match(token, /^elevate_wh_[a-f0-9]{48}$/i);
    assert.doesNotMatch(token, /user|workspace|uuid/i);
  });

  it("produces unique identities for unrelated tenants", () => {
    const a = randomWebhookToken();
    const b = randomWebhookToken();
    assert.notEqual(a, b);
    assert.equal(isOpaqueWebhookToken(a), true);
    assert.equal(isOpaqueWebhookToken(b), true);
  });

  it("rejects predictable or empty tokens", () => {
    assert.equal(isOpaqueWebhookToken(""), false);
    assert.equal(isOpaqueWebhookToken("elevate_wh_short"), false);
    assert.equal(isOpaqueWebhookToken("workspace-123"), false);
    assert.equal(isOpaqueWebhookToken("elevate_wh_" + "0".repeat(47)), false);
  });
});
