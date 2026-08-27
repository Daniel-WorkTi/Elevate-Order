import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isE164Phone,
  WHATSAPP_CONNECTION_STATUSES,
  WHATSAPP_CONVERSATION_STATUSES,
  WHATSAPP_MESSAGE_DIRECTIONS,
  WHATSAPP_MESSAGE_STATUSES,
  WHATSAPP_MESSAGE_TYPES,
} from "@/lib/whatsapp/domain-types";

describe("WhatsApp domain-types", () => {
  it("exports expected connection statuses", () => {
    assert.deepEqual(
      [...WHATSAPP_CONNECTION_STATUSES],
      ["pending", "connected", "disconnected", "error"],
    );
  });

  it("exports expected conversation statuses", () => {
    assert.deepEqual([...WHATSAPP_CONVERSATION_STATUSES], ["open", "closed"]);
  });

  it("exports expected message directions and statuses", () => {
    assert.deepEqual([...WHATSAPP_MESSAGE_DIRECTIONS], ["inbound", "outbound"]);
    assert(WHATSAPP_MESSAGE_STATUSES.includes("received"));
    assert(WHATSAPP_MESSAGE_STATUSES.includes("queued"));
  });

  it("exports expected message types", () => {
    assert(WHATSAPP_MESSAGE_TYPES.includes("template"));
    assert(WHATSAPP_MESSAGE_TYPES.includes("unknown"));
  });

  it("isE164Phone matches DB-aligned pattern", () => {
    assert(isE164Phone("+351912345678"));
    assert(!isE164Phone("351912345678"));
    assert(!isE164Phone("+351"));
  });
});
