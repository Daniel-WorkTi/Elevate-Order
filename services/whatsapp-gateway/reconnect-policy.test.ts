import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DisconnectReason } from "@whiskeysockets/baileys";

import {
  classifyDisconnect,
  reconnectDelayMs,
} from "./src/reconnect-policy.ts";

describe("reconnect-policy", () => {
  it("treats restartRequired as immediate reconnect without clearing auth", () => {
    const decision = classifyDisconnect(DisconnectReason.restartRequired);
    assert.equal(decision.kind, "restart");
    assert.equal(decision.shouldReconnect, true);
    assert.equal(decision.clearAuth, false);
    assert.equal(decision.resetBackoff, true);
  });

  it("treats loggedOut and badSession as fatal", () => {
    for (const code of [DisconnectReason.loggedOut, DisconnectReason.badSession]) {
      const decision = classifyDisconnect(code);
      assert.equal(decision.kind, "fatal");
      assert.equal(decision.shouldReconnect, false);
      assert.equal(decision.clearAuth, true);
    }
  });

  it("treats transient socket errors as recoverable", () => {
    for (const code of [
      DisconnectReason.connectionClosed,
      DisconnectReason.connectionLost,
      DisconnectReason.timedOut,
      DisconnectReason.unavailableService,
    ]) {
      const decision = classifyDisconnect(code);
      assert.equal(decision.kind, "recoverable");
      assert.equal(decision.shouldReconnect, true);
      assert.equal(decision.clearAuth, false);
    }
  });

  it("applies backoff schedule with jitter bounds", () => {
    const attempt1 = reconnectDelayMs(1);
    const attempt2 = reconnectDelayMs(2);
    const attempt3 = reconnectDelayMs(3);
    const attempt4 = reconnectDelayMs(4);
    const attempt10 = reconnectDelayMs(10);

    assert.ok(attempt1 >= 1000 && attempt1 <= 1200);
    assert.ok(attempt2 >= 2000 && attempt2 <= 2400);
    assert.ok(attempt3 >= 5000 && attempt3 <= 6000);
    assert.ok(attempt4 >= 10000 && attempt4 <= 12000);
    assert.ok(attempt10 >= 10000 && attempt10 <= 12000);
  });
});
