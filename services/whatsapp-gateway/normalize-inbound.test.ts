import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeInboundMessage,
  resolveInboundSenderPhone,
} from "./src/inbound/normalize-inbound.ts";

describe("normalizeInboundMessage", () => {
  it("extracts text inbound from conversation payload", async () => {
    const event = await normalizeInboundMessage({
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

  it("prefers remoteJidAlt PN over WhatsApp LID remoteJid", async () => {
    const event = await normalizeInboundMessage({
      workspaceId: "a",
      connectionId: "b",
      message: {
        key: {
          remoteJid: "158459244884164@lid",
          remoteJidAlt: "351931815886@s.whatsapp.net",
          fromMe: false,
          id: "LID1",
        },
        message: { conversation: "SIM" },
      },
    });

    assert.ok(event);
    assert.equal(event?.from, "+351931815886");
  });

  it("resolves LID via mapping when remoteJidAlt is missing", async () => {
    const phone = await resolveInboundSenderPhone(
      {
        remoteJid: "158459244884164@lid",
        fromMe: false,
        id: "LID2",
      },
      async () => "351931815886@s.whatsapp.net",
    );

    assert.equal(phone, "+351931815886");
  });

  it("ignores groups, fromMe, and bare LID without PN mapping", async () => {
    assert.equal(
      await normalizeInboundMessage({
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
      await normalizeInboundMessage({
        workspaceId: "a",
        connectionId: "b",
        message: {
          key: { remoteJid: "351924371082@s.whatsapp.net", fromMe: true, id: "2" },
          message: { conversation: "hi" },
        },
      }),
      null,
    );

    assert.equal(
      await normalizeInboundMessage({
        workspaceId: "a",
        connectionId: "b",
        message: {
          key: { remoteJid: "158459244884164@lid", fromMe: false, id: "3" },
          message: { conversation: "sim" },
        },
      }),
      null,
    );
  });
});
