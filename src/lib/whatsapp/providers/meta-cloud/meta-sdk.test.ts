import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describePostMessagePayload,
  isMetaTrustedPostMessageOrigin,
  isSecureFacebookLoginContext,
  parseEmbeddedSignupMessage,
  sessionFromEmbeddedSignupData,
} from "@/lib/integrations/whatsapp/meta-sdk";

describe("Meta SDK helpers", () => {
  it("requires https for facebook login context", () => {
    assert.equal(isSecureFacebookLoginContext(), true);
  });

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

  it("parses WA_EMBEDDED_SIGNUP object payloads", () => {
    const parsed = parseEmbeddedSignupMessage({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: { waba_id: "w1", phone_number_id: "p1" },
    });
    assert.ok(parsed);
    assert.equal(parsed?.event, "FINISH");
  });

  it("ignores invalid JSON strings silently", () => {
    assert.equal(parseEmbeddedSignupMessage("{not-json"), null);
  });

  it("classifies OAuth redirect fragments separately from embedded signup JSON", () => {
    const diagnostic = describePostMessagePayload(
      "data=cb=&code=REDACTED&origin=https%3A%2F%2Flocalhost%3A8081&destination=",
    );
    assert.equal(diagnostic.looksLikeOAuthRedirect, true);
    assert.equal(diagnostic.isWhatsAppEmbeddedSignupEvent, false);
    assert.equal(diagnostic.jsonParseOk, false);
    assert.equal(diagnostic.payloadFormat, "string-non-json");
  });

  it("classifies WA_EMBEDDED_SIGNUP JSON payloads", () => {
    const diagnostic = describePostMessagePayload(
      JSON.stringify({
        type: "WA_EMBEDDED_SIGNUP",
        event: "FINISH",
        data: { waba_id: "w1", phone_number_id: "p1" },
      }),
    );
    assert.equal(diagnostic.jsonParseOk, true);
    assert.equal(diagnostic.isWhatsAppEmbeddedSignupEvent, true);
    assert.equal(diagnostic.messageType, "WA_EMBEDDED_SIGNUP");
    assert.equal(diagnostic.messageEvent, "FINISH");
  });

  it("accepts official Meta facebook.com and facebook.net origins", () => {
    assert.equal(isMetaTrustedPostMessageOrigin("https://www.facebook.com"), true);
    assert.equal(isMetaTrustedPostMessageOrigin("https://business.facebook.com"), true);
    assert.equal(isMetaTrustedPostMessageOrigin("https://staticxx.facebook.com"), true);
    assert.equal(isMetaTrustedPostMessageOrigin("https://connect.facebook.net"), true);
    assert.equal(isMetaTrustedPostMessageOrigin("https://evil.example.com"), false);
    assert.equal(isMetaTrustedPostMessageOrigin("http://www.facebook.com"), false);
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
