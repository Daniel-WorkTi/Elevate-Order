import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { signInboundPayload, verifyInboundRequest } from "./hmac.server.ts";

describe("inbound hmac", () => {
  it("verifies valid signed payload", () => {
    process.env.GATEWAY_INTERNAL_SECRET = "test-secret";
    const body = JSON.stringify({ hello: "world" });
    const timestamp = String(Date.now());
    const signature = signInboundPayload(timestamp, body);

    assert.doesNotThrow(() =>
      verifyInboundRequest({
        rawBody: body,
        timestampHeader: timestamp,
        signatureHeader: signature,
      }),
    );
  });

  it("rejects tampered signature", () => {
    process.env.GATEWAY_INTERNAL_SECRET = "test-secret";
    const body = JSON.stringify({ hello: "world" });
    const timestamp = String(Date.now());

    assert.throws(() =>
      verifyInboundRequest({
        rawBody: body,
        timestampHeader: timestamp,
        signatureHeader: "sha256=deadbeef",
      }),
    );
  });
});
