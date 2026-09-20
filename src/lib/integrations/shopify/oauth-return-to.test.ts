import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_SHOPIFY_OAUTH_RETURN_TO,
  sanitizeShopifyOauthReturnTo,
  shopifyOauthErrorReturnTo,
} from "./oauth-return-to.ts";

describe("sanitizeShopifyOauthReturnTo", () => {
  it("defaults to connections shopify", () => {
    assert.equal(sanitizeShopifyOauthReturnTo(undefined), DEFAULT_SHOPIFY_OAUTH_RETURN_TO);
    assert.equal(sanitizeShopifyOauthReturnTo(""), DEFAULT_SHOPIFY_OAUTH_RETURN_TO);
  });

  it("allows onboarding configuration return", () => {
    assert.equal(
      sanitizeShopifyOauthReturnTo("/onboarding?step=configuration"),
      "/onboarding?step=configuration",
    );
  });

  it("maps legacy store/orders returnTo to configuration", () => {
    assert.equal(
      sanitizeShopifyOauthReturnTo("/onboarding?step=store"),
      "/onboarding?step=configuration",
    );
    assert.equal(
      sanitizeShopifyOauthReturnTo("/onboarding?step=orders"),
      "/onboarding?step=configuration",
    );
  });

  it("rejects open redirects", () => {
    assert.equal(sanitizeShopifyOauthReturnTo("https://evil.example"), DEFAULT_SHOPIFY_OAUTH_RETURN_TO);
    assert.equal(sanitizeShopifyOauthReturnTo("//evil.example"), DEFAULT_SHOPIFY_OAUTH_RETURN_TO);
    assert.equal(sanitizeShopifyOauthReturnTo("/\\evil"), DEFAULT_SHOPIFY_OAUTH_RETURN_TO);
  });

  it("maps oauth errors to safe targets", () => {
    assert.equal(
      shopifyOauthErrorReturnTo("/onboarding?step=configuration"),
      "/onboarding?step=configuration&error=oauth",
    );
    assert.equal(
      shopifyOauthErrorReturnTo("/onboarding?step=store"),
      "/onboarding?step=configuration&error=oauth",
    );
    assert.equal(shopifyOauthErrorReturnTo("/connections/shopify"), "/connections/shopify?error=oauth");
  });
});
