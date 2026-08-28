import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeInboundMessage } from "./src/inbound/normalize-inbound.ts";

describe("normalizeInboundMessage", () => {
  it("extracts text inbound from conversation payload", () => {
    const event = normalizeInboundMessage({
      workspaceId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      connectionId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      message: {
        key: {
          remoteJid: "351924371082@s.whatsapp.net",
          fromMe: false,
          id: "MSG123",
        },
        message: { conversation: "Confirmo" },
        messageTimestamp: 1_700_000_000,
      },
    });

    assert.ok(event);
    assert.equal(event?.text, "Confirmo");
    assert.equal(event?.from, "+351924371082");
    assert.equal(event?.externalMessageId, "MSG123");
  });

  it("ignores groups and fromMe", () => {
    assert.equal(
      normalizeInboundMessage({
        workspaceId: "a",
        connectionId: "b",
        message: {
          key: { remoteJid: "1203630123@g.us", fromMe: false, id: "1" },
          message: { conversation: "hi" },
        },
      }),
      null,
    );

    assert.equal(
      normalizeInboundMessage({
        workspaceId: "a",
        connectionId: "b",
        message: {
          key: { remoteJid: "351924371082@s.whatsapp.net", fromMe: true, id: "2" },
          message: { conversation: "hi" },
        },
      }),
      null,
    );
  });
});
