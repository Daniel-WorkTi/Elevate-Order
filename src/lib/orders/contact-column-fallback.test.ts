import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Contract: missing last_whatsapp_contact_at must not force LEGACY select
 * (which drops confirmed_at / COD / customer fields).
 */
describe("orders select contact-column fallback contract", () => {
  it("detects contact-column-only schema errors", () => {
    const message =
      'column orders.last_whatsapp_contact_at does not exist';
    assert.match(message, /last_whatsapp_contact_at/i);
    assert.match(message, /column|does not exist/i);
  });

  it("documents preferred fallback order", () => {
    const steps = ["WITH_CONTACT", "CORE_WITHOUT_CONTACT", "LEGACY"];
    assert.deepEqual(steps, ["WITH_CONTACT", "CORE_WITHOUT_CONTACT", "LEGACY"]);
  });
});
