import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { eventStatusIdForUpsert } from "./event-status-id.ts";

describe("eventStatusIdForUpsert", () => {
  it("preserves finite numeric status ids", () => {
    assert.equal(eventStatusIdForUpsert(12), 12);
    assert.equal(eventStatusIdForUpsert(0), 0);
  });

  it("maps null/undefined/non-finite to sentinel 0", () => {
    assert.equal(eventStatusIdForUpsert(null), 0);
    assert.equal(eventStatusIdForUpsert(undefined), 0);
    assert.equal(eventStatusIdForUpsert(Number.NaN), 0);
  });
});
