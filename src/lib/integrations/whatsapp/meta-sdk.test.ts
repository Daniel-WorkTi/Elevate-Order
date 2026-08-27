import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseEmbeddedSignupMessage,
  sessionFromEmbeddedSignupData,
} from "@/lib/integrations/whatsapp/meta-sdk";

describe("Meta SDK helpers", () => {
  it("parses WA_EMBEDDED_SIGNUP finish messages", () => {
    const parsed = parseEmbeddedSignupMessage(
      JSON.stringify({
        type: "WA_EMBEDDED_SIGNUP",
        event: "FINISH",
        data: { waba_id: "w1", phone_number_id: "p1" },
      }),
    );
    assert.ok(parsed);
    assert.equal(parsed?.event, "FINISH");
  });

  it("ignores unrelated postMessage payloads", () => {
    assert.equal(parseEmbeddedSignupMessage(JSON.stringify({ type: "OTHER" })), null);
  });

  it("extracts session hints without treating them as authoritative", () => {
    const session = sessionFromEmbeddedSignupData({
      waba_id: "waba",
      phone_number_id: "phone",
      business_id: "biz",
    });
    assert.deepEqual(session, {
      wabaId: "waba",
      phoneNumberId: "phone",
      businessId: "biz",
    });
  });
});

describe("Embedded Signup cancel behavior", () => {
  it("cancel event does not produce session finish data by itself", () => {
    const parsed = parseEmbeddedSignupMessage(
      JSON.stringify({ type: "WA_EMBEDDED_SIGNUP", event: "CANCEL", data: {} }),
    );
    assert.equal(parsed?.event, "CANCEL");
    const session = sessionFromEmbeddedSignupData(parsed?.data);
    assert.deepEqual(session, {});
  });
});
