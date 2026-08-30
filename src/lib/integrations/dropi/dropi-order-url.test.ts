import assert from "node:assert/strict";
import { test } from "node:test";

import { dropiDashboardBaseUrl, dropiOrdersPanelUrl } from "@/lib/integrations/dropi/dropi-order-url";

test("H: Dropi panel URL uses safe general orders path", () => {
  const url = dropiOrdersPanelUrl();
  assert.match(url, /^https:\/\//);
  assert.match(url, /\/orders$/);
  assert.doesNotMatch(url, /\?/);
});

test("Dropi dashboard base URL defaults to app.dropi.co", () => {
  assert.equal(dropiDashboardBaseUrl(), "https://app.dropi.co");
});
