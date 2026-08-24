import assert from "node:assert/strict";
import { test } from "node:test";

import { buildOrderProgress } from "@/lib/orders/order-progress";
import type { OrderEventRow } from "@/lib/synced-orders.functions";

const t = (key: string) => key;

function event(partial: Partial<OrderEventRow> & Pick<OrderEventRow, "id" | "status_name" | "event_date">): OrderEventRow {
  return {
    order_id: 1,
    status_id: 1,
    details: null,
    tracking_code: null,
    tracking_url: null,
    shipping_company: null,
    total: null,
    source: "Dropi",
    created_at: partial.event_date,
    ...partial,
  };
}

test("buildOrderProgress marks journey stages", () => {
  const steps = buildOrderProgress(
    [
      event({ id: "1", status_name: "Confirmado", event_date: "2025-08-23T14:00:00.000Z" }),
      event({ id: "2", status_name: "Pagamento aprovado", event_date: "2025-08-23T14:10:00.000Z" }),
      event({ id: "3", status_name: "Aguardando envio", event_date: "2025-08-23T14:20:00.000Z" }),
    ],
    { status_name: "Aguardando envio", details: null, created_at: null, last_event_at: null },
    t,
  );

  assert.equal(steps[0]?.state, "done");
  assert.equal(steps[1]?.state, "done");
  assert.equal(steps[2]?.state, "current");
  assert.equal(steps[3]?.state, "upcoming");
  assert.equal(steps[4]?.state, "upcoming");
});
