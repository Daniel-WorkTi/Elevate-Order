import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { e164ToBaileysJid } from "./src/phone-jid.ts";
import { isE164Phone } from "./src/phone-e164.ts";

describe("gateway phone helpers", () => {
  it("validates E.164", () => {
    assert.equal(isE164Phone("+351912345678"), true);
    assert.equal(isE164Phone("351912345678"), false);
  });

  it("converts E.164 to Baileys JID", () => {
    assert.equal(e164ToBaileysJid("+351912345678"), "351912345678@s.whatsapp.net");
  });

  it("rejects invalid recipient", () => {
    assert.throws(() => e164ToBaileysJid("+123"), /invalid_recipient/);
  });
});
