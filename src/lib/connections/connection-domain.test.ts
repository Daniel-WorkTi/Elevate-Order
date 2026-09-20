import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildConnectionSummary,
  connectionStateFromSkip,
  isConnectedState,
  mapDropiConnectionState,
  mapDropeaConnectionState,
  mapShopifyConnectionState,
  mapWhatsAppConnectionState,
  readyRowKind,
} from "./connection-domain.ts";

describe("connection-domain", () => {
  it("Shopify selection alone is not connected", () => {
    assert.equal(mapShopifyConnectionState({ connected: false }), "not_connected");
    assert.equal(mapShopifyConnectionState({ connected: true }), "connected");
    assert.equal(mapShopifyConnectionState({ connected: false, connecting: true }), "connecting");
  });

  it("Dropi configured (waiting for event) is not connected", () => {
    assert.equal(mapDropiConnectionState("configured"), "awaiting_external_action");
    assert.equal(mapDropiConnectionState("connected"), "connected");
    assert.equal(mapDropiConnectionState("not_configured"), "not_connected");
  });

  it("Dropea not_configured never becomes connected", () => {
    assert.equal(mapDropeaConnectionState("not_configured"), "not_connected");
    assert.equal(mapDropeaConnectionState("error"), "error");
    assert.equal(mapDropeaConnectionState("connected", { syncing: true }), "syncing");
  });

  it("WhatsApp without session is not_connected", () => {
    assert.equal(mapWhatsAppConnectionState(null), "not_connected");
    assert.equal(mapWhatsAppConnectionState("disconnected"), "not_connected");
    assert.equal(mapWhatsAppConnectionState("qr_ready"), "connecting");
    assert.equal(mapWhatsAppConnectionState("connected"), "connected");
  });

  it("reconnect only from real reconnecting status", () => {
    assert.equal(mapWhatsAppConnectionState("reconnecting"), "reconnecting");
    assert.notEqual(mapWhatsAppConnectionState("disconnected"), "reconnecting");
    assert.notEqual(mapWhatsAppConnectionState("connecting"), "reconnecting");
  });

  it("skipped is not connected for Ready rows", () => {
    assert.equal(readyRowKind("not_connected", true), "skipped");
    assert.equal(readyRowKind("connected", true), "connected");
    assert.equal(readyRowKind("not_connected", false), "pending");
    assert.equal(readyRowKind("error", false), "error");
  });

  it("isConnectedState only true for connected", () => {
    assert.equal(isConnectedState("connected"), true);
    assert.equal(isConnectedState("awaiting_external_action"), false);
    assert.equal(isConnectedState("syncing"), false);
  });

  it("buildConnectionSummary keeps skip separate from state", () => {
    const summary = buildConnectionSummary({
      provider: "shopify",
      state: "not_connected",
      displayName: "Shopify",
      skipped: true,
    });
    assert.equal(summary.skipped, true);
    assert.equal(summary.state, "not_connected");
    assert.equal(connectionStateFromSkip(true, "not_connected"), "not_connected");
  });
});
