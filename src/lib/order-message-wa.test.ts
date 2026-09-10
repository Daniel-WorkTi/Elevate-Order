import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildWhatsAppLink, normalizeWhatsAppPhone } from "./order-message.ts";
import { safeTrackingHref } from "./order-domain.ts";

describe("wa.me generation", () => {
  it("normalizes phone to digits and encodes message text", () => {
    const phone = normalizeWhatsAppPhone("+351 931 815 886");
    assert.equal(phone, "351931815886");
    const link = buildWhatsAppLink(phone!, "Olá João — pedido #999\nhttps://track.example/abc?x=1");
    assert.ok(link.startsWith("https://wa.me/351931815886?text="));
    assert.ok(link.includes(encodeURIComponent("Olá João — pedido #999")));
    assert.ok(link.includes(encodeURIComponent("https://track.example/abc?x=1")));
  });

  it("rejects short phones", () => {
    assert.equal(normalizeWhatsAppPhone("123"), null);
  });
});

describe("tracking URL safety", () => {
  it("accepts only http(s) tracking urls", () => {
    assert.equal(safeTrackingHref("https://carrier.example/t/1"), "https://carrier.example/t/1");
    assert.equal(safeTrackingHref("not-a-url"), null);
    assert.equal(safeTrackingHref(null), null);
  });
});
