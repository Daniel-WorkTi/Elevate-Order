import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { WhatsAppServerConfig } from "@/lib/integrations/whatsapp/config";
import {
  debugWhatsAppToken,
  exchangeEmbeddedSignupCode,
  normalizeMetaDisplayPhone,
  resolveAuthorizedWhatsAppResources,
  type GraphFetch,
} from "@/lib/integrations/whatsapp/graph";

const config: WhatsAppServerConfig = {
  appId: "app-id",
  configId: "config-id",
  appSecret: "app-secret",
  graphVersion: "v21.0",
  sdkVersion: "v21.0",
  redirectUri: null,
  tokenEncryptionKeyBase64: Buffer.alloc(32, 7).toString("base64"),
};

function mockFetch(routes: Record<string, unknown>): GraphFetch {
  return async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    for (const [pattern, body] of Object.entries(routes)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(body), { status: 200 });
      }
    }
    return new Response(JSON.stringify({ error: { message: "not found" } }), { status: 404 });
  };
}

describe("normalizeMetaDisplayPhone", () => {
  it("accepts E.164 values", () => {
    assert.equal(normalizeMetaDisplayPhone("+351912345678"), "+351912345678");
  });
});

describe("Graph client", () => {
  it("exchanges authorization code server-side", async () => {
    const fetchImpl = mockFetch({
      "/oauth/access_token": { access_token: "bis-token", token_type: "bearer" },
    });
    const token = await exchangeEmbeddedSignupCode(config, "auth-code", fetchImpl);
    assert.equal(token.accessToken, "bis-token");
  });

  it("debug_token resolves authorized WABA ids", async () => {
    const fetchImpl = mockFetch({
      "/debug_token": {
        data: {
          is_valid: true,
          granular_scopes: [
            { scope: "whatsapp_business_management", target_ids: ["waba-1"] },
            { scope: "whatsapp_business_messaging", target_ids: ["1234567890"] },
          ],
        },
      },
    });
    const debug = await debugWhatsAppToken(config, "bis-token", fetchImpl);
    assert.deepEqual(debug.wabaIds, ["waba-1"]);
    assert.deepEqual(debug.phoneNumberIds, ["1234567890"]);
  });

  it("retries token exchange with redirect_uri when the first attempt fails", async () => {
    let attempts = 0;
    const fetchImpl: GraphFetch = async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      attempts += 1;
      if (!url.includes("redirect_uri=")) {
        return new Response(
          JSON.stringify({
            error: {
              message:
                "Error validating verification code. Please make sure your redirect_uri is identical.",
            },
          }),
          { status: 400 },
        );
      }
      return new Response(JSON.stringify({ access_token: "bis-token", token_type: "bearer" }), {
        status: 200,
      });
    };

    const token = await exchangeEmbeddedSignupCode(
      config,
      "auth-code",
      fetchImpl,
      "https://localhost:8081/connections/whatsapp",
    );
    assert.equal(token.accessToken, "bis-token");
    assert.equal(attempts, 2);
  });

  it("resolveAuthorizedWhatsAppResources prefers session hints when debug_token has no ids", async () => {
    const fetchImpl = mockFetch({
      "/debug_token": {
        data: {
          is_valid: true,
          granular_scopes: [
            { scope: "whatsapp_business_management", target_ids: ["waba-graph"] },
            { scope: "whatsapp_business_messaging", target_ids: ["9876543210"] },
          ],
        },
      },
      "/9876543210": {
        id: "9876543210",
        display_phone_number: "+351912345678",
        verified_name: "Elevate Test",
      },
    });

    const resolved = await resolveAuthorizedWhatsAppResources(
      config,
      "bis-token",
      null,
      { wabaId: "waba-browser", phoneNumberId: "1111111111" },
      fetchImpl,
    );

    assert.equal(resolved.wabaId, "waba-graph");
    assert.equal(resolved.phoneNumberId, "9876543210");
    assert.equal(resolved.verifiedName, "Elevate Test");
  });

  it("resolveAuthorizedWhatsAppResources uses session hints when debug_token is empty", async () => {
    const fetchImpl = mockFetch({
      "/debug_token": {
        data: {
          is_valid: true,
          granular_scopes: [],
        },
      },
      "/1111111111": {
        id: "1111111111",
        display_phone_number: "+351900000000",
        verified_name: "Session Hint",
      },
    });

    const resolved = await resolveAuthorizedWhatsAppResources(
      config,
      "bis-token",
      null,
      { wabaId: "waba-browser", phoneNumberId: "1111111111" },
      fetchImpl,
    );

    assert.equal(resolved.wabaId, "waba-browser");
    assert.equal(resolved.phoneNumberId, "1111111111");
    assert.equal(resolved.verifiedName, "Session Hint");
  });
});
