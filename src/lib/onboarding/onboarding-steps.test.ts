import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveOnboardingInitialStep,
} from "../../components/onboarding/onboarding-step-storage.ts";
import {
  normalizeOnboardingStepId,
  ONBOARDING_STEP_ORDER,
} from "../../components/onboarding/types.ts";
import { readyRowKind } from "../connections/connection-domain.ts";

describe("onboarding 3-step model", () => {
  it("stepper order is Configuration → WhatsApp → Ready (no Orders)", () => {
    assert.deepEqual([...ONBOARDING_STEP_ORDER], ["configuration", "whatsapp", "ready"]);
    assert.equal(ONBOARDING_STEP_ORDER.includes("orders" as never), false);
    assert.equal(ONBOARDING_STEP_ORDER.includes("store" as never), false);
  });

  it("maps legacy ?step=store and ?step=orders to configuration", () => {
    assert.equal(normalizeOnboardingStepId("store"), "configuration");
    assert.equal(normalizeOnboardingStepId("orders"), "configuration");
    assert.equal(normalizeOnboardingStepId("configuration"), "configuration");
    assert.equal(normalizeOnboardingStepId("whatsapp"), "whatsapp");
    assert.equal(normalizeOnboardingStepId("bogus"), null);
  });

  it("resolveOnboardingInitialStep remaps legacy URL steps", () => {
    assert.equal(resolveOnboardingInitialStep("orders"), "configuration");
    assert.equal(resolveOnboardingInitialStep("store"), "configuration");
    assert.equal(resolveOnboardingInitialStep("whatsapp"), "whatsapp");
    assert.equal(resolveOnboardingInitialStep(undefined), "configuration");
  });

  it("skipped never equals connected for Ready summary", () => {
    assert.equal(readyRowKind("not_connected", true), "skipped");
    assert.notEqual(readyRowKind("not_connected", true), "connected");
    assert.equal(readyRowKind("connected", true), "connected");
  });
});
