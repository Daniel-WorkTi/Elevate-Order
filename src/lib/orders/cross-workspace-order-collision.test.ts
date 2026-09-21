import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  allowsSameExternalOrderIdAcrossWorkspaces,
  collectCrossWorkspaceOrderCollisions,
} from "./cross-workspace-order-collision.ts";

describe("workspace-scoped order identity", () => {
  it("allows the same external order_id across two workspaces", () => {
    assert.equal(allowsSameExternalOrderIdAcrossWorkspaces(), true);
    const blocked = collectCrossWorkspaceOrderCollisions(
      [
        { order_id: 12345, workspace_id: "ws-a" },
        { order_id: 12345, workspace_id: "ws-b" },
      ],
      "ws-a",
    );
    assert.equal(blocked.size, 0);
  });

  it("does not block writes merely because another tenant has the same order_id", () => {
    const blocked = collectCrossWorkspaceOrderCollisions(
      [{ order_id: 200, workspace_id: "tenant-b" }],
      "tenant-a",
    );
    assert.equal(blocked.has(200), false);
  });
});
