import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isUniqueOwnerConflict,
  pickOwnedWorkspace,
  scoreOwnedWorkspace,
  type OwnedWorkspaceCandidate,
} from "./pick-owned-workspace.ts";

const empty = (id: string, createdAt: string): OwnedWorkspaceCandidate => ({
  id,
  name: "W",
  createdAt,
});

describe("pickOwnedWorkspace", () => {
  it("returns null for empty list", () => {
    assert.equal(pickOwnedWorkspace([]), null);
  });

  it("returns the sole candidate", () => {
    const only = empty("a", "2026-01-01T00:00:00Z");
    assert.equal(pickOwnedWorkspace([only])?.id, "a");
  });

  it("prefers operational signals over created_at alone", () => {
    const olderEmpty = empty("older", "2026-01-01T00:00:00Z");
    const newerActive: OwnedWorkspaceCandidate = {
      id: "newer",
      name: "Active",
      createdAt: "2026-02-01T00:00:00Z",
      hasWebhook: true,
      hasWhatsApp: true,
      hasOrders: true,
    };
    assert.equal(pickOwnedWorkspace([olderEmpty, newerActive])?.id, "newer");
    assert.ok(scoreOwnedWorkspace(newerActive) > scoreOwnedWorkspace(olderEmpty));
  });

  it("ties fall back to earliest created_at then id", () => {
    const a = empty("bbbb", "2026-01-02T00:00:00Z");
    const b = empty("aaaa", "2026-01-01T00:00:00Z");
    assert.equal(pickOwnedWorkspace([a, b])?.id, "aaaa");
  });

  it("never invents a candidate (2+ empty → stable first by ordering)", () => {
    const list = [
      empty("c", "2026-01-03T00:00:00Z"),
      empty("a", "2026-01-01T00:00:00Z"),
      empty("b", "2026-01-02T00:00:00Z"),
    ];
    assert.equal(pickOwnedWorkspace(list)?.id, "a");
  });
});

describe("isUniqueOwnerConflict", () => {
  it("detects postgres unique violations", () => {
    assert.equal(isUniqueOwnerConflict("duplicate key value violates unique constraint"), true);
    assert.equal(isUniqueOwnerConflict('unique constraint "workspaces_owner_user_id_uidx"'), true);
    assert.equal(isUniqueOwnerConflict("23505"), true);
    assert.equal(isUniqueOwnerConflict("Unable to create workspace."), false);
  });
});
