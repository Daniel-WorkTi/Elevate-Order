import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ConnectLock } from "./src/connect-lock.ts";

describe("connect-lock", () => {
  it("serializes parallel calls for the same key", async () => {
    const lock = new ConnectLock();
    let active = 0;
    let maxActive = 0;

    const work = () =>
      lock.run("conn-1", async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 30));
        active -= 1;
      });

    await Promise.all([work(), work()]);
    assert.equal(maxActive, 1);
  });

  it("allows parallel calls for different keys", async () => {
    const lock = new ConnectLock();
    let active = 0;
    let maxActive = 0;

    const work = (key: string) =>
      lock.run(key, async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 30));
        active -= 1;
      });

    await Promise.all([work("a"), work("b")]);
    assert.equal(maxActive, 2);
  });
});
