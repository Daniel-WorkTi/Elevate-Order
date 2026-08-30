import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DROPI_SOURCE_INDEX_PREDICATE,
  isDropiSupplySource,
} from "@/lib/orders/cod-operation";

const migrationSql = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../supabase/migrations/20260828270000_cod_operation_handled.sql",
  ),
  "utf8",
);

const phase6PanelSql = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../supabase/migrations/20260828260000_cod_confirmation_panel.sql",
  ),
  "utf8",
);

test("Phase 6 dependency gate — requires cod_reply_intent and cod_reply_at", () => {
  assert.match(migrationSql, /phase6_cod_confirmation_panel_required/);
  assert.match(migrationSql, /column_name = 'cod_reply_intent'/);
  assert.match(migrationSql, /column_name = 'cod_reply_at'/);
});

test("Phase 6 panel defines cod_reply_intent CHECK with confirm/reject/needs_operator", () => {
  assert.match(phase6PanelSql, /cod_reply_intent text/);
  assert.match(phase6PanelSql, /'confirm'/);
  assert.match(phase6PanelSql, /'reject'/);
  assert.match(phase6PanelSql, /'needs_operator'/);
});

test("L: cod_operation_handled requires order_uuid and order_id in CHECK", () => {
  assert.match(
    migrationSql,
    /order_confirmation_events_order_required_chk[\s\S]*cod_operation_handled[\s\S]*order_uuid IS NOT NULL[\s\S]*order_id IS NOT NULL/,
  );
});

test("M: cod_operation_handled requires operator source and actor in CHECK", () => {
  assert.match(migrationSql, /order_confirmation_events_handled_operator_chk/);
  assert.match(
    migrationSql,
    /event_type <> 'cod_operation_handled'[\s\S]*source = 'operator'[\s\S]*actor_user_id IS NOT NULL/,
  );
});

test("confirmation_classified excluded from order_required_chk", () => {
  const match = migrationSql.match(
    /ADD CONSTRAINT order_confirmation_events_order_required_chk[\s\S]*?\);/,
  );
  assert.ok(match);
  assert.match(match![0], /event_type NOT IN \('order_confirmed', 'cod_operation_handled'\)/);
  assert.doesNotMatch(match![0], /confirmation_classified/);
});

test("E/F: workspace owner required for mark handled", () => {
  assert.match(migrationSql, /operator_not_authorized_for_workspace/);
  assert.match(
    migrationSql,
    /mark_cod_operation_handled[\s\S]*w\.owner_user_id = p_actor_user_id/,
  );
});

test("B/C: migration rejects non-Dropi (Dropea pattern)", () => {
  assert.match(migrationSql, /order_not_dropi/);
  assert.match(migrationSql, /dropea/);
});

test("D/E: migration rejects non-confirm intent", () => {
  assert.match(migrationSql, /order_not_cod_confirm/);
  assert.match(migrationSql, /cod_reply_intent IS DISTINCT FROM 'confirm'/);
});

test("F/G: idempotent via unique handled event + already_handled", () => {
  assert.match(migrationSql, /order_confirmation_events_one_handled_uidx/);
  assert.match(migrationSql, /already_handled := true/);
});

test("H: first call sets applied=true", () => {
  assert.match(migrationSql, /applied := true/);
  assert.match(migrationSql, /already_handled := false/);
});

test("I/J: concurrency — FOR UPDATE on order row", () => {
  assert.match(migrationSql, /FOR UPDATE/);
});

test("K: existing event repairs cache without second INSERT", () => {
  assert.match(migrationSql, /repair cache if drifted|Event is source of truth/);
  assert.match(
    migrationSql,
    /v_existing_id IS NOT NULL[\s\S]*cod_handled_at = v_existing_at/,
  );
  const insertCount = (migrationSql.match(/INSERT INTO public\.order_confirmation_events/g) ?? [])
    .length;
  assert.equal(insertCount, 1, "single INSERT path in RPC");
});

test("4: single v_handled_at timestamp for event and cache", () => {
  assert.match(migrationSql, /v_handled_at := now\(\)/);
  assert.match(migrationSql, /created_at[\s\S]*v_handled_at/);
  assert.match(migrationSql, /cod_handled_at = v_handled_at/);
});

test("5: tenant-safe backfill joins workspace_id", () => {
  assert.match(
    migrationSql,
    /o\.workspace_id = e\.workspace_id/,
  );
});

test("3: Dropi-specific partial index aligned with TS predicate", () => {
  assert.match(migrationSql, /idx_orders_cod_dropi_pending/);
  assert.match(migrationSql, /source ILIKE '%dropi%'/);
  assert.match(migrationSql, /source NOT ILIKE '%dropea%'/);
  assert.match(migrationSql, new RegExp(DROPI_SOURCE_INDEX_PREDICATE.replace(/'/g, "'")));
});

test("TS isDropiSupplySource matches domain values", () => {
  assert.equal(isDropiSupplySource("Dropi Pro"), true);
  assert.equal(isDropiSupplySource("dropi"), true);
  assert.equal(isDropiSupplySource("Dropea"), false);
  assert.equal(isDropiSupplySource("Shopify"), false);
});

test("N/O/7: mark handled does NOT mutate supply confirmation fields", () => {
  assert.doesNotMatch(
    migrationSql,
    /UPDATE public\.orders[\s\S]*status_name\s*=/,
  );
  assert.doesNotMatch(
    migrationSql,
    /UPDATE public\.orders[\s\S]*details\s*=/,
  );
  assert.doesNotMatch(
    migrationSql,
    /UPDATE public\.orders[\s\S]*confirmed_at\s*=/,
  );
  assert.doesNotMatch(
    migrationSql,
    /UPDATE public\.orders[\s\S]*external_confirmation_status\s*=/,
  );
});

test("7: cod_operation_handled INSERT uses operator source only", () => {
  assert.match(
    migrationSql,
    /'cod_operation_handled'[\s\S]*'operator'/,
  );
});
