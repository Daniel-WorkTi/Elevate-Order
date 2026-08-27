import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toWhatsAppUserError, whatsAppUserMessage } from "@/lib/integrations/whatsapp/errors";

describe("WhatsApp error sanitization", () => {
  it("maps configuration missing to support message", () => {
    const err = toWhatsAppUserError(new Error("WHATSAPP_NOT_CONFIGURED"));
    assert.equal(err.message, whatsAppUserMessage("not_configured"));
  });

  it("maps Meta graph failures to generic retry message", () => {
    const err = toWhatsAppUserError(new Error("Meta Graph oauth/access_token failed"));
    assert.equal(err.message, whatsAppUserMessage("meta_unavailable"));
    assert.ok(!err.message.includes("oauth/access_token"));
  });

  it("maps duplicate phone conflicts", () => {
    const err = toWhatsAppUserError(new Error("already linked to another workspace"));
    assert.equal(err.message, whatsAppUserMessage("phone_already_connected"));
  });

  it("maps workspace already connected", () => {
    const err = toWhatsAppUserError(new Error("workspace already connected"));
    assert.equal(err.message, whatsAppUserMessage("workspace_already_connected"));
  });

  it("does not expose stack traces in user message", () => {
    const err = toWhatsAppUserError(new Error("debug_token validation failed"));
    assert.ok(!err.message.includes("debug_token"));
  });

  it("maps encryption failures without importing server crypto", () => {
    const err = toWhatsAppUserError(
      Object.assign(new Error("Invalid WhatsApp token encryption key."), { name: "TokenCryptoError" }),
    );
    assert.equal(err.message, whatsAppUserMessage("encryption_unavailable"));
  });
});
