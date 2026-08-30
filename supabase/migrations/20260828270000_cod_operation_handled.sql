-- Phase 7 — COD Operations (Dropi manual workflow)
-- PROPOSE ONLY — apply after 20260828260000_cod_confirmation_panel.sql
--
-- Aligned with TS: supplyMatchesSource('dropi', source) in src/lib/order-domain.ts
-- Partial index WHERE: source ILIKE '%dropi%' AND source NOT ILIKE '%dropea%'
BEGIN;

-- ============================================================
-- 0) Phase 6 panel dependency gate
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'cod_reply_intent'
  ) THEN
    RAISE EXCEPTION 'phase6_cod_confirmation_panel_required: apply 20260828260000 first';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'cod_reply_at'
  ) THEN
    RAISE EXCEPTION 'phase6_cod_confirmation_panel_required: apply 20260828260000 first';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'orders'
      AND c.conname LIKE '%cod_reply_intent%'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints cc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_schema = cc.constraint_schema
     AND ccu.constraint_name = cc.constraint_name
    WHERE cc.constraint_schema = 'public'
      AND ccu.table_name = 'orders'
      AND ccu.column_name = 'cod_reply_intent'
      AND cc.check_clause LIKE '%confirm%'
  ) THEN
    RAISE NOTICE 'phase7: cod_reply_intent CHECK not found by name — verify Phase 6 panel migration applied';
  END IF;
END $$;

-- ============================================================
-- 1) Event type + DB invariants for cod_operation_handled
-- ============================================================
ALTER TABLE public.order_confirmation_events
  DROP CONSTRAINT IF EXISTS order_confirmation_events_event_type_check;

ALTER TABLE public.order_confirmation_events
  ADD CONSTRAINT order_confirmation_events_event_type_check
    CHECK (event_type IN (
      'confirmation_classified',
      'order_confirmed',
      'cod_operation_handled'
    ));

ALTER TABLE public.order_confirmation_events
  DROP CONSTRAINT IF EXISTS order_confirmation_events_order_required_chk;

ALTER TABLE public.order_confirmation_events
  ADD CONSTRAINT order_confirmation_events_order_required_chk
    CHECK (
      event_type NOT IN ('order_confirmed', 'cod_operation_handled')
      OR (
        order_uuid IS NOT NULL
        AND order_id IS NOT NULL
      )
    );

ALTER TABLE public.order_confirmation_events
  DROP CONSTRAINT IF EXISTS order_confirmation_events_handled_operator_chk;

ALTER TABLE public.order_confirmation_events
  ADD CONSTRAINT order_confirmation_events_handled_operator_chk
    CHECK (
      event_type <> 'cod_operation_handled'
      OR (
        source = 'operator'
        AND actor_user_id IS NOT NULL
      )
    );

COMMENT ON TABLE public.order_confirmation_events IS
  'Elevate COD audit: classification, Elevate confirm, operator Dropi handled.';

-- One handled marker per order (idempotent operator action; concurrency barrier)
CREATE UNIQUE INDEX IF NOT EXISTS order_confirmation_events_one_handled_uidx
  ON public.order_confirmation_events (order_uuid)
  WHERE event_type = 'cod_operation_handled';

-- ============================================================
-- 2) Denormalized cache (source of truth = cod_operation_handled event)
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cod_handled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cod_handled_by_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.orders.cod_handled_at IS
  'Cache: operator marked manual Dropi action done. Canonical audit: cod_operation_handled event.';

COMMENT ON COLUMN public.orders.cod_handled_by_user_id IS
  'Cache: actor from cod_operation_handled event.';

-- Dropi pending queue partial index — aligned with supplyMatchesSource('dropi', source)
DROP INDEX IF EXISTS idx_orders_cod_dropi_pending;

CREATE INDEX IF NOT EXISTS idx_orders_cod_dropi_pending
  ON public.orders (workspace_id, cod_reply_at DESC)
  WHERE cod_reply_intent = 'confirm'
    AND cod_handled_at IS NULL
    AND source ILIKE '%dropi%'
    AND source NOT ILIKE '%dropea%';

-- ============================================================
-- 3) Tenant-safe backfill cache from existing handled events
-- ============================================================
UPDATE public.orders o
SET
  cod_handled_at = e.created_at,
  cod_handled_by_user_id = e.actor_user_id,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (order_uuid)
    order_uuid,
    workspace_id,
    created_at,
    actor_user_id
  FROM public.order_confirmation_events
  WHERE event_type = 'cod_operation_handled'
    AND order_uuid IS NOT NULL
  ORDER BY order_uuid, created_at ASC
) e
WHERE o.id = e.order_uuid
  AND o.workspace_id = e.workspace_id
  AND o.cod_handled_at IS NULL;

-- ============================================================
-- mark_cod_operation_handled — idempotent operator action
-- Does NOT: confirmed_at, external_confirmation_status, status_name, details
-- Meaning: operator completed manual Dropi action — NOT "Dropi confirmed"
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_cod_operation_handled(
  p_workspace_id uuid,
  p_order_uuid uuid,
  p_actor_user_id uuid
)
RETURNS TABLE (
  applied boolean,
  already_handled boolean,
  event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_event_id uuid;
  v_existing_id uuid;
  v_existing_at timestamptz;
  v_existing_actor uuid;
  v_handled_at timestamptz;
BEGIN
  IF p_actor_user_id IS NULL THEN
    RAISE EXCEPTION 'actor_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id = p_workspace_id
      AND w.owner_user_id IS NOT NULL
      AND w.owner_user_id = p_actor_user_id
  ) THEN
    RAISE EXCEPTION 'operator_not_authorized_for_workspace';
  END IF;

  SELECT * INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_uuid
    AND o.workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF coalesce(v_order.source, '') !~* 'dropi'
     OR coalesce(v_order.source, '') ~* 'dropea' THEN
    RAISE EXCEPTION 'order_not_dropi';
  END IF;

  IF v_order.cod_reply_intent IS DISTINCT FROM 'confirm'
     AND NOT EXISTS (
       SELECT 1
       FROM public.order_confirmation_events e
       WHERE e.workspace_id = p_workspace_id
         AND e.order_uuid = p_order_uuid
         AND e.event_type = 'confirmation_classified'
         AND e.intent = 'confirm'
     ) THEN
    RAISE EXCEPTION 'order_not_cod_confirm';
  END IF;

  SELECT e.id, e.created_at, e.actor_user_id
    INTO v_existing_id, v_existing_at, v_existing_actor
  FROM public.order_confirmation_events e
  WHERE e.workspace_id = p_workspace_id
    AND e.order_uuid = p_order_uuid
    AND e.event_type = 'cod_operation_handled'
  LIMIT 1;

  IF v_existing_id IS NOT NULL OR v_order.cod_handled_at IS NOT NULL THEN
    -- Event is source of truth — repair cache if drifted
    IF v_existing_id IS NOT NULL AND (
      v_order.cod_handled_at IS NULL
      OR v_order.cod_handled_at IS DISTINCT FROM v_existing_at
      OR (
        v_existing_actor IS NOT NULL
        AND v_order.cod_handled_by_user_id IS DISTINCT FROM v_existing_actor
      )
    ) THEN
      UPDATE public.orders o
      SET
        cod_handled_at = v_existing_at,
        cod_handled_by_user_id = COALESCE(v_existing_actor, o.cod_handled_by_user_id),
        updated_at = now()
      WHERE o.id = p_order_uuid
        AND o.workspace_id = p_workspace_id;
    END IF;

    applied := false;
    already_handled := true;
    event_id := v_existing_id;
    RETURN NEXT;
    RETURN;
  END IF;

  v_handled_at := now();

  INSERT INTO public.order_confirmation_events (
    workspace_id,
    order_uuid,
    order_id,
    event_type,
    source,
    actor_user_id,
    metadata,
    created_at
  ) VALUES (
    p_workspace_id,
    p_order_uuid,
    v_order.order_id,
    'cod_operation_handled',
    'operator',
    p_actor_user_id,
    jsonb_build_object(
      'supply_source', v_order.source,
      'dropi_order_id', v_order.order_id
    ),
    v_handled_at
  )
  RETURNING id INTO v_event_id;

  UPDATE public.orders o
  SET
    cod_handled_at = v_handled_at,
    cod_handled_by_user_id = p_actor_user_id,
    updated_at = now()
  WHERE o.id = p_order_uuid
    AND o.workspace_id = p_workspace_id;

  applied := true;
  already_handled := false;
  event_id := v_event_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_cod_operation_handled(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_cod_operation_handled(uuid, uuid, uuid) TO service_role;

COMMIT;
