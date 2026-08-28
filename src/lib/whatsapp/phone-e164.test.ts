import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizePhoneToE164 } from "./phone-e164.server.ts";

describe("normalizePhoneToE164", () => {
  it("accepts formatted E.164", () => {
    assert.equal(normalizePhoneToE164("+351 912 345 678"), "+351912345678");
  });

  it("accepts digits with country code", () => {
    assert.equal(normalizePhoneToE164("351912345678"), "+351912345678");
  });

  it("accepts international with plus", () => {
    assert.equal(normalizePhoneToE164("+48123456789"), "+48123456789");
  });

  it("rejects ambiguous local numbers without country code", () => {
    assert.equal(normalizePhoneToE164("912345678"), null);
  });

  it("rejects empty input", () => {
    assert.equal(normalizePhoneToE164(""), null);
    assert.equal(normalizePhoneToE164(null), null);
  });
});
