import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { renderOrderTemplate } from "./render-template.ts";

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
});
