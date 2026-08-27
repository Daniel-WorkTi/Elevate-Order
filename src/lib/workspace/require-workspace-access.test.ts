import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";
import {
  WorkspaceAccessError,
  workspaceAccessHttpStatus,
} from "@/lib/workspace/require-workspace-access";

describe("parseWorkspaceId", () => {
  it("accepts valid uuids", () => {
    assert.equal(
      parseWorkspaceId("550e8400-e29b-41d4-a716-446655440000"),
      "550e8400-e29b-41d4-a716-446655440000",
    );
  });

  it("rejects empty and invalid", () => {
    assert.equal(parseWorkspaceId(""), null);
    assert.equal(parseWorkspaceId("not-a-uuid"), null);
    assert.equal(parseWorkspaceId("  "), null);
  });
});

describe("WorkspaceAccessError", () => {
  it("maps codes to http status", () => {
    assert.equal(workspaceAccessHttpStatus(new WorkspaceAccessError("unauthenticated", "x")), 401);
    assert.equal(workspaceAccessHttpStatus(new WorkspaceAccessError("forbidden", "x")), 403);
    assert.equal(workspaceAccessHttpStatus(new WorkspaceAccessError("not_found", "x")), 404);
  });
});
