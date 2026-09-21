import { createHmac } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  decodeOauthCookie,
  encodeOauthCookie,
  verifyShopifyQueryHmac,
  verifyShopifyWebhookHmac,
} from "@/lib/integrations/shopify/oauth";

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

test("encodeOauthCookie is round-trippable without Shopify secret (dev)", () => {
  const prevKey = process.env["SHOPIFY_API_KEY"];
  const prevSecret = process.env["SHOPIFY_API_SECRET"];
  delete process.env["SHOPIFY_API_KEY"];
  delete process.env["SHOPIFY_API_SECRET"];
  try {
    const encoded = encodeOauthCookie({
      state: "nonce",
      shop: "demo.myshopify.com",
      userId: "user-1",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      returnTo: "/onboarding",
    });
    const decoded = decodeOauthCookie(encoded);
    assert.equal(decoded?.state, "nonce");
    assert.equal(decoded?.workspaceId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  } finally {
    if (prevKey !== undefined) process.env["SHOPIFY_API_KEY"] = prevKey;
    else delete process.env["SHOPIFY_API_KEY"];
    if (prevSecret !== undefined) process.env["SHOPIFY_API_SECRET"] = prevSecret;
    else delete process.env["SHOPIFY_API_SECRET"];
  }
});

test("encodeOauthCookie HMAC rejects tampered payload when secret is set", () => {
  const prevKey = process.env["SHOPIFY_API_KEY"];
  const prevSecret = process.env["SHOPIFY_API_SECRET"];
  process.env["SHOPIFY_API_KEY"] = "key";
  process.env["SHOPIFY_API_SECRET"] = "super-secret";
  try {
    const encoded = encodeOauthCookie({
      state: "nonce",
      shop: "demo.myshopify.com",
      userId: "user-1",
      workspaceId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });
    assert.match(encoded, /^v1\./);
    const parts = encoded.split(".");
    assert.equal(parts.length, 3);
    const tampered = `${parts[0]}.${Buffer.from('{"state":"x","shop":"y","userId":"z"}').toString("base64url")}.${parts[2]}`;
    assert.equal(decodeOauthCookie(tampered), null);
    assert.equal(decodeOauthCookie(encoded)?.workspaceId, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const legacy = Buffer.from(
      JSON.stringify({ state: "n", shop: "s.myshopify.com", userId: "u" }),
      "utf8",
    ).toString("base64url");
    assert.equal(decodeOauthCookie(legacy), null);
  } finally {
    if (prevKey !== undefined) process.env["SHOPIFY_API_KEY"] = prevKey;
    else delete process.env["SHOPIFY_API_KEY"];
    if (prevSecret !== undefined) process.env["SHOPIFY_API_SECRET"] = prevSecret;
    else delete process.env["SHOPIFY_API_SECRET"];
  }
});
