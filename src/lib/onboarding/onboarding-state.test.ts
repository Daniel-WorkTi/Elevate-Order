import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldShowOnboarding } from "./onboarding-state.ts";

describe("shouldShowOnboarding", () => {
  it("forces onboarding for new accounts without completion cookie", () => {
    assert.equal(
      shouldShowOnboarding({
        userId: "user-1",
        createdAt: new Date().toISOString(),
        cookieValue: null,
      }),
      true,
    );
  });

  it("skips onboarding when user completed it", () => {
    assert.equal(
      shouldShowOnboarding({
        userId: "user-1",
        createdAt: new Date().toISOString(),
        cookieValue: "user-1|user-2",
      }),
      false,
    );
  });

  it("grandfathers older accounts even without cookie", () => {
    assert.equal(
      shouldShowOnboarding({
        userId: "user-1",
        createdAt: "2020-01-01T00:00:00.000Z",
        cookieValue: null,
      }),
      false,
    );
  });
});
