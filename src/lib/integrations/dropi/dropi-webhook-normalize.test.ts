import assert from "node:assert/strict";
import { test } from "node:test";

import {
  coalesceStatic,
  normalizeDropiWebhookEvent,
  prepareDropiWebhookBody,
  dropiWebhookPayloadSchema,
} from "@/lib/integrations/dropi/dropi-webhook-normalize";
import { getOrderStatus } from "@/lib/order-domain";

test("prepareDropiWebhookBody unwraps nested Dropi wrappers", () => {
  const prepared = prepareDropiWebhookBody({
    data: {
      order_id: "9001",
      event_date: "2026-09-10T12:00:00.000Z",
      status_name: "Enviado",
      tracking_url: null,
    },
  });
  const parsed = dropiWebhookPayloadSchema.safeParse(prepared);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  const event = normalizeDropiWebhookEvent(parsed.data as never);
  assert.equal(event.order_id, 9001);
  assert.equal(event.tracking_url, null);
  assert.equal(event.tracking_code, null);
});

test("normalizeDropiWebhookEvent keeps missing tracking as null (never invents URL)", () => {
  const event = normalizeDropiWebhookEvent({
    order_id: 42,
    event_date: "2026-09-10T10:00:00.000Z",
    status_name: "Pendiente",
  });
  assert.equal(event.tracking_code, null);
  assert.equal(event.tracking_url, null);
});

test("coalesceStatic prefers incoming then existing", () => {
  assert.equal(coalesceStatic("Ana", "Old"), "Ana");
  assert.equal(coalesceStatic(null, "Old"), "Old");
  assert.equal(coalesceStatic("", "Old"), "Old");
  assert.equal(coalesceStatic(null, null), null);
});

test("unknown raw status does not become confirmed", () => {
  const status = getOrderStatus({
    status_name: "ZZZ_MYSTERY_STATE",
    details: null,
  });
  assert.equal(status.key, "unknown");
});

test("incident keywords map to incident, not confirmed", () => {
  assert.equal(
    getOrderStatus({ status_name: "Incidencia — dirección incorrecta", details: null }).key,
    "incident",
  );
  assert.equal(getOrderStatus({ status_name: "Cliente ausente", details: null }).key, "incident");
});

test("idempotent-friendly event identity fields stay stable", () => {
  const a = normalizeDropiWebhookEvent({
    order_id: 7,
    event_date: "2026-09-10T08:00:00.000Z",
    status_id: 3,
    status_name: "En tránsito",
  });
  const b = normalizeDropiWebhookEvent({
    order_id: 7,
    event_date: "2026-09-10T08:00:00.000Z",
    status_id: 3,
    status_name: "En tránsito",
  });
  assert.equal(a.order_id, b.order_id);
  assert.equal(a.event_date, b.event_date);
  assert.equal(a.status_id, b.status_id);
});
