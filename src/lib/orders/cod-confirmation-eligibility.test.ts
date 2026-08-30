import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { isSupplySnapshotIneligibleForCodConfirmation } from "@/lib/orders/cod-confirmation-eligibility";

const migrationSql = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../supabase/migrations/20260828250000_whatsapp_cod_confirmation.sql",
  ),
  "utf8",
);

test("migration blocks classification of non-inbound messages", () => {
  assert.match(migrationSql, /classification_requires_inbound_message/);
  assert.match(
    migrationSql,
    /record_confirmation_classification[\s\S]*v_msg\.direction <> 'inbound'/,
  );
});

test("migration requires workspace owner for operator confirm", () => {
  assert.match(migrationSql, /operator_not_authorized_for_workspace/);
  assert.match(
    migrationSql,
    /confirm_order_cod[\s\S]*w\.owner_user_id = p_actor_user_id/,
  );
});

test("Waiting → eligible", () => {
  assert.equal(
    isSupplySnapshotIneligibleForCodConfirmation({
      status_name: "Waiting",
      details: "Pendente em confirmação",
    }),
    false,
  );
});

test("Cancelled → denied", () => {
  assert.equal(
    isSupplySnapshotIneligibleForCodConfirmation({
      status_name: "Cancelled",
      details: null,
    }),
    true,
  );
});

test("Delivered → denied", () => {
  assert.equal(
    isSupplySnapshotIneligibleForCodConfirmation({
      status_name: "Delivered",
      details: null,
    }),
    true,
  );
});

test("Returned → denied", () => {
  assert.equal(
    isSupplySnapshotIneligibleForCodConfirmation({
      status_name: "Devolvido",
      details: null,
    }),
    true,
  );
});

test("Shipped → denied", () => {
  assert.equal(
    isSupplySnapshotIneligibleForCodConfirmation({
      status_name: "Shipped",
      details: null,
    }),
    true,
  );
});

test("Enviado → denied", () => {
  assert.equal(
    isSupplySnapshotIneligibleForCodConfirmation({
      status_name: "Enviado",
      details: null,
    }),
    true,
  );
});

test("Despachado → denied", () => {
  assert.equal(
    isSupplySnapshotIneligibleForCodConfirmation({
      status_name: "Despachado",
      details: "Em trânsito",
    }),
    true,
  );
});
