import assert from "node:assert/strict";
import { test } from "node:test";

import { buildOrderProgress } from "@/lib/orders/order-progress";
import type { OrderEventRow } from "@/lib/synced-orders.functions";

const t = (key: string) => key;

function event(
  partial: Partial<OrderEventRow> & Pick<OrderEventRow, "id" | "status_name" | "event_date">,
): OrderEventRow {
  return {
    order_id: 1,
    status_id: 1,
    details: null,
    tracking_code: null,
    tracking_url: null,
    shipping_company: null,
    total: null,
    source: "Shopify",
    created_at: partial.event_date,
    ...partial,
  };
}

test("Shopify journey: site → pending → confirmed → shipped", () => {
  const steps = buildOrderProgress(
    [
      event({ id: "1", status_name: "Pedido no site", event_date: "2025-08-23T10:00:00.000Z" }),
      event({
        id: "2",
        status_name: "Pendente em confirmação",
        event_date: "2025-08-23T11:00:00.000Z",
      }),
      event({ id: "3", status_name: "Confirmado", event_date: "2025-08-23T14:00:00.000Z" }),
      event({ id: "4", status_name: "Enviado", event_date: "2025-08-24T10:00:00.000Z" }),
    ],
    { status_name: "Enviado", details: null, created_at: null, last_event_at: null },
    t,
  );

  assert.equal(steps.length, 6);
  assert.equal(steps[0]?.state, "done");
  assert.equal(steps[1]?.state, "done");
  assert.equal(steps[2]?.state, "done");
  assert.equal(steps[3]?.state, "current");
  assert.equal(steps[4]?.label, "orders.detail.progress.delivered");
  assert.equal(steps[4]?.state, "upcoming");
  assert.equal(steps[5]?.label, "orders.detail.progress.paid");
  assert.equal(steps[5]?.state, "upcoming");
});

test("pending confirmation does not jump to confirmed", () => {
  const steps = buildOrderProgress(
    [
      event({ id: "1", status_name: "Pedido no site", event_date: "2025-08-23T10:00:00.000Z" }),
      event({
        id: "2",
        status_name: "Pendente em confirmação",
        event_date: "2025-08-23T11:00:00.000Z",
      }),
    ],
    {
      status_name: "Pendente em confirmação",
      details: null,
      created_at: null,
      last_event_at: null,
    },
    t,
  );

  assert.equal(steps[1]?.state, "current");
  assert.equal(steps[2]?.state, "upcoming");
});

test("incident after ship marks shipped stage as problem", () => {
  const steps = buildOrderProgress(
    [
      event({ id: "1", status_name: "Confirmado", event_date: "2025-08-23T14:00:00.000Z" }),
      event({ id: "2", status_name: "Enviado", event_date: "2025-08-24T10:00:00.000Z" }),
    ],
    {
      status_name: "Incidencia",
      details: "Ausente — encomenda devolvida",
      created_at: null,
      last_event_at: null,
    },
    t,
  );

  assert.equal(steps[3]?.state, "problem");
  assert.equal(steps[4]?.state, "upcoming");
  assert.equal(steps[5]?.state, "upcoming");
});

test("delivered then paid reaches final stage", () => {
  const steps = buildOrderProgress(
    [
      event({ id: "1", status_name: "Entregue", event_date: "2025-08-25T12:00:00.000Z" }),
      event({ id: "2", status_name: "Pago", event_date: "2025-08-25T12:30:00.000Z" }),
    ],
    { status_name: "Pago", details: null, created_at: null, last_event_at: null },
    t,
  );

  assert.equal(steps[4]?.state, "done");
  assert.equal(steps[5]?.state, "current");
  assert.equal(steps[5]?.label, "Pago");
});
