import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyOperatorDropiSummary,
  resolveDropiOperatorStatus,
} from "./dropi-operator-status.ts";
import type { DropiConnectionSummary } from "./dropi-types.ts";

function summary(partial: Partial<DropiConnectionSummary>): DropiConnectionSummary {
  return {
    status: "not_configured",
    method: "webhook",
    webhookPath: "/api/public/webhooks/orders",
    webhookRelativeUrl: "/api/public/webhooks/orders",
    authConfigured: true,
    serverConfigured: true,
    lastWebhookAt: null,
    lastSuccessfulEventAt: null,
    orderCount: null,
    eventsToday: null,
    failedEventsToday: null,
    errorMessage: null,
    ...partial,
  };
}

describe("resolveDropiOperatorStatus", () => {
  it("never marks connected from local preference — requires server events", () => {
    assert.equal(resolveDropiOperatorStatus(summary({})), "configured");
  });

  it("marks connected when Dropi events exist", () => {
    assert.equal(
      resolveDropiOperatorStatus(summary({ orderCount: 3, lastSuccessfulEventAt: "2026-01-01" })),
      "connected",
    );
  });

  it("marks not_configured when server auth is missing", () => {
    assert.equal(
      resolveDropiOperatorStatus(summary({ authConfigured: false, serverConfigured: true })),
      "not_configured",
    );
  });

  it("applyOperatorDropiSummary overwrites badge from backend truth", () => {
    const next = applyOperatorDropiSummary(
      summary({ status: "connected", orderCount: 0, lastSuccessfulEventAt: null }),
    );
    assert.equal(next.status, "configured");
  });
});
