import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isWhatsAppGatewayConfigured } from "./context.ts";

describe("isWhatsAppGatewayConfigured", () => {
  it("requires both gateway URL and internal secret", () => {
    const prevUrl = process.env["WHATSAPP_GATEWAY_URL"];
    const prevSecret = process.env["GATEWAY_INTERNAL_SECRET"];

    delete process.env["WHATSAPP_GATEWAY_URL"];
    delete process.env["GATEWAY_INTERNAL_SECRET"];
    assert.equal(isWhatsAppGatewayConfigured(), false);

    process.env["WHATSAPP_GATEWAY_URL"] = "https://gateway.example";
    delete process.env["GATEWAY_INTERNAL_SECRET"];
    assert.equal(isWhatsAppGatewayConfigured(), false);

    process.env["GATEWAY_INTERNAL_SECRET"] = "test-secret";
    assert.equal(isWhatsAppGatewayConfigured(), true);

    if (prevUrl === undefined) delete process.env["WHATSAPP_GATEWAY_URL"];
    else process.env["WHATSAPP_GATEWAY_URL"] = prevUrl;
    if (prevSecret === undefined) delete process.env["GATEWAY_INTERNAL_SECRET"];
    else process.env["GATEWAY_INTERNAL_SECRET"] = prevSecret;
  });
});
