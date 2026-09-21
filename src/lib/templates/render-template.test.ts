import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderOrderTemplate } from "./render-template.ts";
import { findMalformedPlaceholders } from "./template-variables.ts";

describe("renderOrderTemplate missing variables", () => {
  it("never prints undefined/null or raw placeholders for empty fields", () => {
    const { text, unsupported } = renderOrderTemplate({
      template:
        "Olá {{customer_name}} — #{{order_id}} {{tracking_code}} {{tracking_url}} {{details}} {{bogus}}",
      context: {
        supply: "dropi",
        customerName: null,
        orderId: "42",
        shopifyOrderId: null,
        statusName: null,
        details: null,
        trackingCode: null,
        trackingUrl: null,
        shippingCompany: null,
        total: null,
        currency: null,
      },
      language: "pt",
    });

    assert.ok(!text.includes("undefined"));
    assert.ok(!text.includes("null"));
    assert.ok(!text.includes("{{"));
    assert.ok(text.includes("#42"));
    assert.ok(text.includes("[variável indisponível: bogus]"));
    assert.ok(unsupported.includes("bogus"));
  });

  it("never invents EUR for {{currency}} when order has no currency", () => {
    const { text } = renderOrderTemplate({
      template: "Total {{total}} {{currency}}",
      context: {
        supply: "dropi",
        customerName: "Ana",
        orderId: "7",
        shopifyOrderId: null,
        statusName: null,
        details: null,
        trackingCode: null,
        trackingUrl: null,
        shippingCompany: null,
        total: 42.5,
        currency: null,
      },
      language: "pt",
    });
    assert.ok(!/\bEUR\b/.test(text));
    assert.ok(!text.includes("{{currency}}"));
    assert.ok(text.includes("42.50"));
  });
});

describe("findMalformedPlaceholders", () => {
  it("flags placeholders with spaces or hyphens", () => {
    const issues = findMalformedPlaceholders("Hi {{customer name}} {{foo-bar}} {{order_id}}");
    assert.ok(issues.some((i) => i.includes("customer name")));
    assert.ok(issues.some((i) => i.includes("foo-bar")));
    assert.equal(
      issues.some((i) => i.includes("{{order_id}}")),
      false,
    );
  });
});
