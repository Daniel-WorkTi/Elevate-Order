import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isPublicWebhookAuthorized,
  webhookAuthConfigured,
} from "@/lib/integrations/webhook-auth";

test("webhookAuthConfigured does not treat publishable key as ingest auth", () => {
  const prevPub = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const prevTok = process.env["ELEVATE_WEBHOOK_TOKEN"];
  process.env["SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_fake";
  delete process.env["ELEVATE_WEBHOOK_TOKEN"];
  assert.equal(webhookAuthConfigured(), false);
  process.env["ELEVATE_WEBHOOK_TOKEN"] = "elevate_wh_test";
  assert.equal(webhookAuthConfigured(), true);
  if (prevPub === undefined) delete process.env["SUPABASE_PUBLISHABLE_KEY"];
  else process.env["SUPABASE_PUBLISHABLE_KEY"] = prevPub;
  if (prevTok === undefined) delete process.env["ELEVATE_WEBHOOK_TOKEN"];
  else process.env["ELEVATE_WEBHOOK_TOKEN"] = prevTok;
});

test("isPublicWebhookAuthorized rejects publishable apikey alone", () => {
  const prevPub = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const prevTok = process.env["ELEVATE_WEBHOOK_TOKEN"];
  process.env["SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_fake";
  delete process.env["ELEVATE_WEBHOOK_TOKEN"];
  const req = new Request("https://example.com/api/public/webhooks/orders", {
    headers: { apikey: "sb_publishable_fake" },
  });
  assert.equal(isPublicWebhookAuthorized(req), false);
  if (prevPub === undefined) delete process.env["SUPABASE_PUBLISHABLE_KEY"];
  else process.env["SUPABASE_PUBLISHABLE_KEY"] = prevPub;
  if (prevTok === undefined) delete process.env["ELEVATE_WEBHOOK_TOKEN"];
  else process.env["ELEVATE_WEBHOOK_TOKEN"] = prevTok;
});
