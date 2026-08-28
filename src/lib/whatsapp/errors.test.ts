import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toWhatsAppUserError, whatsAppUserMessage } from "@/lib/whatsapp/errors";

describe("WhatsApp errors", () => {
  it("maps gateway errors", () => {
    const err = toWhatsAppUserError(new Error("WHATSAPP_GATEWAY_NOT_CONFIGURED"));
    assert.equal(err.code, "not_configured");
  });

  it("returns user messages for codes", () => {
    assert(whatsAppUserMessage("gateway_unavailable").length > 0);
  });
});
