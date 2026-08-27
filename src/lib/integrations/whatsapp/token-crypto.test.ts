import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";

import {
  decryptWhatsAppToken,
  encryptWhatsAppToken,
  TokenCryptoError,
} from "@/lib/integrations/whatsapp/token-crypto.server";

function keyBase64() {
  return randomBytes(32).toString("base64");
}

describe("WhatsApp token crypto", () => {
  it("encrypt → decrypt roundtrip", () => {
    const key = keyBase64();
    const token = "EAAB-test-access-token-value";
    const ciphertext = encryptWhatsAppToken(token, key);
    assert.notEqual(ciphertext, token);
    assert.equal(decryptWhatsAppToken(ciphertext, key), token);
  });

  it("different nonces produce different ciphertext", () => {
    const key = keyBase64();
    const token = "same-token";
    const a = encryptWhatsAppToken(token, key);
    const b = encryptWhatsAppToken(token, key);
    assert.notEqual(a, b);
  });

  it("rejects invalid encryption key", () => {
    assert.throws(
      () => encryptWhatsAppToken("token", Buffer.from("short").toString("base64")),
      (error: unknown) => error instanceof TokenCryptoError && error.code === "invalid_key",
    );
  });

  it("rejects tampered ciphertext", () => {
    const key = keyBase64();
    const ciphertext = encryptWhatsAppToken("token", key);
    const buf = Buffer.from(ciphertext, "base64");
    const last = buf[buf.length - 1];
    if (last === undefined) throw new Error("empty ciphertext");
    buf[buf.length - 1] = last ^ 0xff;
    const tampered = buf.toString("base64");
    assert.throws(
      () => decryptWhatsAppToken(tampered, key),
      (error: unknown) => error instanceof TokenCryptoError && error.code === "decrypt_failed",
    );
  });

  it("plaintext token never equals ciphertext", () => {
    const key = keyBase64();
    const token = "EAAB-visible-token";
    const ciphertext = encryptWhatsAppToken(token, key);
    assert.ok(!ciphertext.includes(token));
  });
});
