import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";

import {
  decryptSessionPayload,
  encryptSessionPayload,
  sanitizeForLog,
} from "./src/crypto/session-crypto.ts";

describe("session crypto", () => {
  const key = randomBytes(32).toString("base64");

  it("roundtrips encrypted payloads", () => {
    const plain = JSON.stringify({ noiseKey: { private: "secret-value" } });
    const enc = encryptSessionPayload(plain, key);
    assert.notEqual(enc, plain);
    assert.equal(decryptSessionPayload(enc, key), plain);
  });

  it("sanitizeForLog redacts sensitive keys", () => {
    const out = sanitizeForLog({ encrypted_creds: "abc", status: "ok" }) as Record<string, unknown>;
    assert.equal(out["encrypted_creds"], "[redacted]");
    assert.equal(out["status"], "ok");
  });
});
