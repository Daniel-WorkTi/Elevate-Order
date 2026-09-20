import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  isLikelyCustomStoreDomain,
  normalizeShopifyDomain,
} from "@/lib/integrations/shopify/shopify-normalize";
import { mapDropiConnectionState, isConnectedState } from "@/lib/connections/connection-domain";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("Shopify domain helper for onboarding", () => {
  it("accepts myshopify and slug forms", () => {
    assert.equal(normalizeShopifyDomain("loja.myshopify.com"), "loja.myshopify.com");
    assert.equal(normalizeShopifyDomain("loja"), "loja.myshopify.com");
  });

  it("flags custom public domains for friendly guidance", () => {
    assert.equal(isLikelyCustomStoreDomain("minhaloja.com"), true);
    assert.equal(isLikelyCustomStoreDomain("www.minhaloja.com"), true);
    assert.equal(isLikelyCustomStoreDomain("https://www.minhaloja.com"), true);
    assert.equal(isLikelyCustomStoreDomain("loja.myshopify.com"), false);
    assert.equal(isLikelyCustomStoreDomain("loja"), false);
  });
});

describe("Dropi connection truth (copy ≠ connected)", () => {
  it("configured/waiting is not connected", () => {
    assert.equal(mapDropiConnectionState("configured"), "awaiting_external_action");
    assert.equal(isConnectedState(mapDropiConnectionState("configured")), false);
    assert.equal(isConnectedState(mapDropiConnectionState("connected")), true);
  });
});

describe("onboarding setup presentation (shared panels)", () => {
  it("Shopify onboarding is simple OAuth-first with myshopify help; advanced collapsed", () => {
    const panel = readSrc("src/components/connections/store/store-connect-panel.tsx");
    assert.match(panel, /variant\s*=\s*"connections"/);
    assert.match(panel, /variant === "onboarding"/);
    assert.match(panel, /onboarding\.setup\.shopify\.dontKnow/);
    assert.match(panel, /onboarding\.setup\.shopify\.findMyshopify/);
    assert.match(panel, /onboarding\.setup\.shopify\.useMyshopify/);
    assert.match(panel, /onboarding\.setup\.shopify\.continueCta/);
    assert.match(panel, /onboarding\.setup\.shopify\.advanced/);
    assert.match(panel, /isLikelyCustomStoreDomain/);
    assert.match(panel, /onOauthInstall/);
    // Advanced token UI only behind tokenOpen
    const onboardingBlock = panel.slice(panel.indexOf('if (onboarding) {'));
    assert.match(onboardingBlock, /tokenOpen \?/);
    assert.doesNotMatch(
      onboardingBlock.slice(0, onboardingBlock.indexOf("tokenOpen ?")),
      /shpat_/,
    );
  });

  it("Dropi onboarding shows 3 steps + real webhook; no ConnectionHowTo docs", () => {
    const panel = readSrc("src/components/connections/dropi/dropi-setup-panel.tsx");
    assert.match(panel, /variant === "onboarding"/);
    assert.match(panel, /onboarding\.setup\.dropi\.step1Path/);
    assert.match(panel, /Configurações → API → Webhooks|onboarding\.setup\.dropi\.step1Path/);
    assert.match(panel, /webhookUrl/);
    assert.match(panel, /onboarding\.setup\.dropi\.waiting/);
    // HowTo only in connections branch
    const onboardingStart = panel.indexOf("if (onboarding) {");
    const connectionsReturn = panel.lastIndexOf("return (");
    const onboardingSection = panel.slice(onboardingStart, connectionsReturn);
    assert.doesNotMatch(onboardingSection, /ConnectionHowTo/);
    assert.doesNotMatch(onboardingSection, /HMAC|payload|localhost/i);
  });

  it("Dropea onboarding shows only required credential fields + friendly error", () => {
    const panel = readSrc("src/components/connections/dropea/dropea-setup-panel.tsx");
    assert.match(panel, /variant === "onboarding"/);
    assert.match(panel, /onboarding-dropea-api-token/);
    assert.match(panel, /onboarding-dropea-hmac-secret/);
    assert.match(panel, /onboarding\.setup\.dropea\.connectFailed/);
    assert.match(panel, /onboarding\.setup\.dropea\.connecting/);
    const onboardingStart = panel.indexOf("if (onboarding) {");
    const connectionsReturn = panel.indexOf("return (", onboardingStart + 20);
    const onboardingSection = panel.slice(onboardingStart, connectionsReturn);
    assert.doesNotMatch(onboardingSection, /ConnectionHowTo/);
    assert.doesNotMatch(onboardingSection, /webhookBlock/);
  });

  it("configuration step wires variant=onboarding and Continue → WhatsApp", () => {
    const step = readSrc("src/components/onboarding/onboarding-configuration-step.tsx");
    assert.match(step, /variant="onboarding"/);
    assert.match(step, /onboarding\.configuration\.continueWhatsApp/);
    assert.match(step, /onboarding\.configuration\.addAnother/);
    assert.match(step, /setActiveProvider\(null\)/);
    assert.match(step, /lg:grid-cols-3/);
    assert.match(step, /max-w-\[680px\]/);
    // OAuth still uses real /auth/shopify
    assert.match(step, /\/auth\/shopify\?/);
    // Dropi webhook from backend helper
    assert.match(step, /getWorkspaceWebhookUrl/);
  });
});
