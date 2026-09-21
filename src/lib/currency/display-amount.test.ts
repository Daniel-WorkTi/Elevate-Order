import assert from "node:assert/strict";
import { test } from "node:test";

import { convertStoredAmount, formatStoredAmount } from "@/lib/currency/display-amount";

test("convertStoredAmount never treats missing source currency as display currency", () => {
  assert.equal(convertStoredAmount(10, null, "EUR", {}), null);
  assert.equal(convertStoredAmount(10, "", "EUR", {}), null);
});

test("formatStoredAmount returns em dash when FX or currency is unknown", () => {
  assert.equal(formatStoredAmount(10, null, "EUR", {}), "—");
  assert.equal(formatStoredAmount(10, "BRL", "EUR", {}), "—");
  const same = formatStoredAmount(10, "EUR", "EUR", {});
  assert.ok(same.includes("10"));
  assert.ok(!same.includes("—"));
});
