import assert from "node:assert/strict";
import { test } from "node:test";

import {
  aggregateRecovery,
  customerInitials,
  formatRecoveryRate,
} from "@/lib/inbox/aggregate-recovery";

test("unknown and Shopify sources are excluded", () => {
  const snapshot = aggregateRecovery([
    {
      orderId: 1,
      customerName: "A",
      source: "Shopify",
      total: 100,
      currency: "EUR",
      statusName: "Delivered",
      details: "WhatsApp contacted",
      lastEventAt: "2026-08-16T10:00:00.000Z",
      events: [],
    },
    {
      orderId: 2,
      customerName: "B",
      source: "Manual",
      total: 50,
      currency: "EUR",
      statusName: "Incident",
      details: null,
      lastEventAt: "2026-08-16T10:00:00.000Z",
      events: [],
    },
  ]);
  assert.equal(snapshot.revenue, 0);
  assert.equal(snapshot.atRisk, 0);
  assert.equal(snapshot.orderCount, 0);
});

test("incident counts as at-risk revenue and workflow", () => {
  const snapshot = aggregateRecovery([
    {
      orderId: 10,
      customerName: "Ana Lima",
      source: "Dropi Pro",
      total: 128.5,
      currency: "EUR",
      statusName: "Failed delivery",
      details: "Recipient unavailable",
      lastEventAt: "2026-08-16T10:00:00.000Z",
      events: [],
    },
  ]);
  assert.equal(snapshot.revenue, 128.5);
  assert.equal(snapshot.atRisk, 128.5);
  assert.equal(snapshot.orderCount, 1);
  assert.equal(snapshot.recovered, 0);
  assert.equal(snapshot.platforms.dropi.workflow, 1);
  assert.equal(snapshot.platforms.dropi.rate, 0);
});

test("message then delivered counts as recovered through messages", () => {
  const snapshot = aggregateRecovery([
    {
      orderId: 100423,
      customerName: "Ana Lima",
      source: "Dropi Pro",
      total: 128.5,
      currency: "EUR",
      statusName: "Delivered",
      details: null,
      lastEventAt: "2026-08-16T12:00:00.000Z",
      events: [
        {
          statusName: "Incident",
          details: "Wrong address",
          at: "2026-08-14T08:00:00.000Z",
        },
        {
          statusName: "Messaged",
          details: "WhatsApp sent",
          at: "2026-08-14T09:00:00.000Z",
        },
        {
          statusName: "Delivered",
          details: null,
          at: "2026-08-16T12:00:00.000Z",
        },
      ],
    },
    {
      orderId: 20411,
      customerName: "Marta Costa",
      source: "Dropea",
      total: 211.4,
      currency: "EUR",
      statusName: "Delivered",
      details: null,
      lastEventAt: "2026-08-15T12:00:00.000Z",
      events: [
        { statusName: "Messaged", details: null, at: "2026-08-13T09:00:00.000Z" },
        { statusName: "Delivered", details: null, at: "2026-08-15T12:00:00.000Z" },
      ],
    },
  ]);

  assert.equal(snapshot.recovered, 339.9);
  assert.equal(snapshot.confirmed, 2);
  assert.equal(snapshot.platforms.dropi.confirmed, 1);
  assert.equal(snapshot.platforms.dropea.confirmed, 1);
  assert.equal(snapshot.recent[0]?.orderId, 100423);
  assert.equal(formatRecoveryRate(1, "en-US"), "100.0%");
});

test("delivered without a prior message is not recovered", () => {
  const snapshot = aggregateRecovery([
    {
      orderId: 9,
      customerName: "Rui",
      source: "Dropi Pro",
      total: 94.9,
      currency: "EUR",
      statusName: "Delivered",
      details: null,
      lastEventAt: "2026-08-16T10:00:00.000Z",
      events: [],
    },
  ]);
  assert.equal(snapshot.recovered, 0);
  assert.equal(snapshot.confirmed, 0);
  assert.equal(snapshot.revenue, 94.9);
});

test("customerInitials uses first and last name", () => {
  assert.equal(customerInitials("Ana Lima"), "AL");
  assert.equal(customerInitials("Rui"), "RU");
  assert.equal(customerInitials("—"), "?");
});
