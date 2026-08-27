import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";

import { encryptWhatsAppToken } from "@/lib/integrations/whatsapp/token-crypto.server";
import type { WhatsAppCompleteSignupResponse } from "@/lib/integrations/whatsapp/whatsapp.functions";

describe("WhatsApp complete signup public response", () => {
  it("never includes token or internal ids", () => {
    const response: WhatsAppCompleteSignupResponse = {
      ok: true,
      status: "connected",
      verifiedName: "Shop",
      displayPhoneNumber: "+351912345678",
    };
    const json = JSON.stringify(response);
    assert.ok(!json.includes("accessToken"));
    assert.ok(!json.includes("tokenCiphertext"));
    assert.ok(!json.includes("wabaId"));
    assert.ok(!json.includes("phoneNumberId"));
    assert.ok(!json.includes("metaBusinessId"));
    assert.ok(!json.includes("EAAB"));
  });
});

describe("WhatsApp complete signup token guard", () => {
  it("encrypted token payload differs from plaintext access token", () => {
    const key = randomBytes(32).toString("base64");
    const accessToken = "EAAB-sample-access-token";
    const ciphertext = encryptWhatsAppToken(accessToken, key);
    assert.ok(!ciphertext.includes(accessToken));
  });
});
