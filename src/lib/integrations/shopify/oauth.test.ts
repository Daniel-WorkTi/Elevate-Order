import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";

import { verifyShopifyQueryHmac, verifyShopifyWebhookHmac } from "@/lib/integrations/shopify/oauth";

test("verifyShopifyQueryHmac accepts a matching hmac", () => {
  const secret = "test-secret";
  const params = new URLSearchParams({
    shop: "demo.myshopify.com",
    code: "abc",
    state: "nonce",
    timestamp: "1710000000",
  });
  const message = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const hmac = createHmac("sha256", secret).update(message).digest("hex");
  params.set("hmac", hmac);
  assert.equal(verifyShopifyQueryHmac(params, secret), true);
});

test("verifyShopifyQueryHmac rejects a tampered hmac", () => {
  const params = new URLSearchParams({
    shop: "demo.myshopify.com",
    hmac: "deadbeef",
  });
  assert.equal(verifyShopifyQueryHmac(params, "test-secret"), false);
});

test("verifyShopifyWebhookHmac accepts a matching body hmac", () => {
  const secret = "whsec";
  const body = '{"id":1}';
  const hmac = createHmac("sha256", secret).update(body, "utf8").digest("base64");
  assert.equal(verifyShopifyWebhookHmac(body, hmac, secret), true);
  assert.equal(verifyShopifyWebhookHmac(body, "nope", secret), false);
});
