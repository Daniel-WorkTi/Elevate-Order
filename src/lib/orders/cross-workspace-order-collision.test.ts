import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { collectCrossWorkspaceOrderCollisions } from "./cross-workspace-order-collision.ts";

describe("collectCrossWorkspaceOrderCollisions", () => {
  it("blocks order_ids owned by another workspace", () => {
    const blocked = collectCrossWorkspaceOrderCollisions(
      [
        { order_id: 1, workspace_id: "ws-a" },
        { order_id: 2, workspace_id: "ws-b" },
        { order_id: 3, workspace_id: null },
      ],
      "ws-a",
    );
    assert.deepEqual([...blocked].sort(), [2]);
  });

  it("allows same-workspace and null-workspace rows", () => {
    const blocked = collectCrossWorkspaceOrderCollisions(
      [
        { order_id: 10, workspace_id: "ws-a" },
        { order_id: 11, workspace_id: null },
      ],
      "ws-a",
    );
    assert.equal(blocked.size, 0);
  });
});
