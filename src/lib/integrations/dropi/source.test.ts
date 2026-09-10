import assert from "node:assert/strict";
import { test } from "node:test";

import { sourceFromWebhookAuth } from "@/lib/integrations/dropi/source";
import { supplyMatchesSource } from "@/lib/order-domain";

test("sourceFromWebhookAuth stamps Dropi token supply even if payload says Shopify", () => {
  assert.equal(sourceFromWebhookAuth("Shopify Store", "dropi"), "Dropi Pro");
  assert.equal(sourceFromWebhookAuth("Dropi Pro", "dropi"), "Dropi Pro");
  assert.equal(sourceFromWebhookAuth("  ", "dropi"), "Dropi Pro");
});

test("sourceFromWebhookAuth stamps Dropea token supply", () => {
  assert.equal(sourceFromWebhookAuth("Dropi Pro", "dropea"), "Dropea");
  assert.equal(sourceFromWebhookAuth("Dropea Sync", "dropea"), "Dropea Sync");
});

test("supplyMatchesSource never mixes Dropi with Shopify or Dropea", () => {
  assert.equal(supplyMatchesSource("dropi", "Dropi Pro"), true);
  assert.equal(supplyMatchesSource("dropi", "Shopify"), false);
  assert.equal(supplyMatchesSource("dropi", "Dropea"), false);
  assert.equal(supplyMatchesSource("dropi", "Dropi via Dropea"), false);
  assert.equal(supplyMatchesSource("dropea", "Dropea"), true);
  assert.equal(supplyMatchesSource("shopify", "Shopify Store"), true);
});
