import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readHealth } from "./src/health.ts";

describe("whatsapp-gateway health", () => {
  it("returns phase 5 inbound payload", () => {
    const health = readHealth();
    assert.equal(health.phase, 5);
    assert.equal(health.features.inboundText, true);
  });
});
