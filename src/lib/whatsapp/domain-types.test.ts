import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isWhatsAppProviderId,
  normalizeConnectionStatus,
  WHATSAPP_CONNECTION_STATUSES,
  WHATSAPP_PROVIDERS,
} from "@/lib/whatsapp/domain-types";
import { resolveActiveWhatsAppProviderId } from "@/lib/whatsapp/providers/context";
import { getActiveWhatsAppProvider, getWhatsAppProvider } from "@/lib/whatsapp/providers/registry";

describe("WhatsApp domain-types", () => {
  it("exports expected connection statuses", () => {
    assert.deepEqual(
      [...WHATSAPP_CONNECTION_STATUSES],
      [
        "disconnected",
        "initializing",
        "qr_ready",
        "connecting",
        "connected",
        "reconnecting",
        "error",
      ],
    );
  });

  it("exports expected providers", () => {
    assert.deepEqual([...WHATSAPP_PROVIDERS], ["whatsapp_web", "meta_cloud"]);
  });

  it("normalizes legacy pending to initializing", () => {
    assert.equal(normalizeConnectionStatus("pending"), "initializing");
    assert.equal(normalizeConnectionStatus("connected"), "connected");
    assert.equal(normalizeConnectionStatus("unknown"), "error");
  });

  it("isWhatsAppProviderId validates provider ids", () => {
    assert(isWhatsAppProviderId("whatsapp_web"));
    assert(!isWhatsAppProviderId("facebook"));
  });
});

describe("WhatsApp provider registry", () => {
  it("defaults active provider to whatsapp_web", () => {
    const prev = process.env["WHATSAPP_PROVIDER"];
    delete process.env["WHATSAPP_PROVIDER"];
    assert.equal(resolveActiveWhatsAppProviderId(), "whatsapp_web");
    assert.equal(getActiveWhatsAppProvider().id, "whatsapp_web");
    if (prev) process.env["WHATSAPP_PROVIDER"] = prev;
  });

  it("registers meta_cloud as isolated legacy provider", () => {
    assert.equal(getWhatsAppProvider("meta_cloud").id, "meta_cloud");
  });
});
