-- ============================================================
-- P0: Workspace-scoped order identity
-- UNIQUE(order_id) → UNIQUE(workspace_id, order_id)
-- order_events uniqueness includes workspace_id
--
-- SAFE: aborts only on duplicates that would violate the new UNIQUE indexes.
-- Does NOT delete rows. Does NOT assign orphan workspace_id.
-- NULL workspace_id rows remain for later reconciliation.
--
-- NOTE on order_events + status_id NULL:
-- Postgres UNIQUE treats NULL as distinct, so multiple rows with the same
-- (workspace_id, order_id, event_date, status_id=NULL) are allowed both by
-- the legacy UNIQUE(order_id, event_date, status_id) and by the new index.
-- Those groups are reported as NOTICE only (sync noise), not abort reasons.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. Preflight report (read-only counts into notices)
-- ------------------------------------------------------------

DO $$
DECLARE
  total_orders bigint;
  null_ws_orders bigint;
  composite_dupes bigint;
  total_events bigint;
  null_ws_events bigint;
  event_dupes_blocking bigint;
  event_dupes_null_status bigint;
BEGIN
  SELECT COUNT(*) INTO total_orders FROM public.orders;
  SELECT COUNT(*) INTO null_ws_orders FROM public.orders WHERE workspace_id IS NULL;

  SELECT COUNT(*) INTO composite_dupes
  FROM (
    SELECT workspace_id, order_id
    FROM public.orders
    WHERE workspace_id IS NOT NULL
    GROUP BY workspace_id, order_id
    HAVING COUNT(*) > 1
  ) d;

  SELECT COUNT(*) INTO total_events FROM public.order_events;
  SELECT COUNT(*) INTO null_ws_events FROM public.order_events WHERE workspace_id IS NULL;

  -- Only non-null status_id groups can violate default UNIQUE index semantics.
  SELECT COUNT(*) INTO event_dupes_blocking
  FROM (
    SELECT workspace_id, order_id, event_date, status_id
    FROM public.order_events
    WHERE workspace_id IS NOT NULL
      AND status_id IS NOT NULL
    GROUP BY workspace_id, order_id, event_date, status_id
    HAVING COUNT(*) > 1
  ) e;

  -- Informational: NULL status_id sync duplicates (allowed by UNIQUE, cleanup later).
  SELECT COUNT(*) INTO event_dupes_null_status
  FROM (
    SELECT workspace_id, order_id, event_date
    FROM public.order_events
    WHERE workspace_id IS NOT NULL
      AND status_id IS NULL
    GROUP BY workspace_id, order_id, event_date
    HAVING COUNT(*) > 1
  ) n;

  RAISE NOTICE 'P0 preflight orders total=% null_workspace=% composite_dupes=%',
    total_orders, null_ws_orders, composite_dupes;
  RAISE NOTICE 'P0 preflight events total=% null_workspace=% blocking_dupes=% null_status_dupes=%',
    total_events, null_ws_events, event_dupes_blocking, event_dupes_null_status;

  IF composite_dupes > 0 THEN
    RAISE EXCEPTION
      'P0 ABORTED: % duplicate (workspace_id, order_id) groups in orders. Reconcile before migration.',
      composite_dupes;
  END IF;

  IF event_dupes_blocking > 0 THEN
    RAISE EXCEPTION
      'P0 ABORTED: % duplicate (workspace_id, order_id, event_date, status_id) groups in order_events (non-null status_id). Reconcile before migration.',
      event_dupes_blocking;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1. orders: drop global UNIQUE(order_id), add composite unique
-- ------------------------------------------------------------

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_order_id_key;

-- Also drop any uniquely named index leftover from UNIQUE column syntax.
DROP INDEX IF EXISTS public.orders_order_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS orders_workspace_order_id_uidx
  ON public.orders (workspace_id, order_id)
  WHERE workspace_id IS NOT NULL;

-- Keep a non-unique index on order_id for lookup within filtered queries.
CREATE INDEX IF NOT EXISTS idx_orders_order_id
  ON public.orders (order_id);

COMMENT ON INDEX public.orders_workspace_order_id_uidx IS
  'External provider order identity is unique per workspace. Same order_id may exist in other workspaces.';

-- ------------------------------------------------------------
-- 2. order_events: workspace-scoped uniqueness
-- ------------------------------------------------------------

ALTER TABLE public.order_events
  DROP CONSTRAINT IF EXISTS order_events_order_id_event_date_status_id_key;

DROP INDEX IF EXISTS public.order_events_order_id_event_date_status_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS order_events_workspace_order_event_uidx
  ON public.order_events (workspace_id, order_id, event_date, status_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_events_workspace_order_id
  ON public.order_events (workspace_id, order_id);

COMMENT ON INDEX public.order_events_workspace_order_event_uidx IS
  'Events are unique per workspace + external order identity + event stamp.';

COMMIT;
