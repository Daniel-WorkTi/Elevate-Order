import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canSendWhatsAppInApp,
  showWhatsAppMeFallback,
  usesWhatsAppGateway,
} from "./send-mode.ts";

const connected = {
  configured: true,
  provider: "whatsapp_web" as const,
  connectionId: "c",
  status: "connected" as const,
  verifiedName: null,
  displayPhoneNumber: null,
  connectedAt: null,
};

const disconnectedConfigured = { ...connected, status: "disconnected" as const };

describe("send-mode", () => {
  it("uses gateway when configured", () => {
    assert.equal(usesWhatsAppGateway(connected), true);
    assert.equal(usesWhatsAppGateway({ ...connected, configured: false }), false);
  });

  it("never shows wa.me when gateway configured", () => {
    assert.equal(showWhatsAppMeFallback(disconnectedConfigured, true), false);
    assert.equal(showWhatsAppMeFallback({ ...connected, configured: false }, true), true);
  });

  it("allows in-app send only when connected", () => {
    assert.equal(canSendWhatsAppInApp(connected, true), true);
    assert.equal(canSendWhatsAppInApp(disconnectedConfigured, true), false);
  });
});
