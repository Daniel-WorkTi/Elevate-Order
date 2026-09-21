import assert from "node:assert/strict";
import { test } from "node:test";

import { ordersSearchSchema, searchToQuery, withSupply } from "@/lib/orders-search";

test("supply=shopify in URL falls back to dropi (operational tabs only)", () => {
  const parsed = ordersSearchSchema.parse({ supply: "shopify" });
  assert.equal(parsed.supply, "dropi");
  assert.equal(searchToQuery(parsed).supply, "dropi");
});

test("withSupply never keeps shopify as an orders search supply", () => {
  const base = ordersSearchSchema.parse({});
  assert.equal(withSupply(base, "shopify").supply, "dropi");
  assert.equal(withSupply(base, "dropea").supply, "dropea");
});
