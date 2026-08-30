-- Phase 6 — Automatic COD Confirmation Engine (revised, not applied until approved)
-- Elevate operational confirmation is separate from supply status_name/details snapshots.
BEGIN;

-- ============================================================
-- 1) Workspace setting — server authority, default OFF
-- ============================================================
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS whatsapp_auto_confirm boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.workspaces.whatsapp_auto_confirm IS
  'When true, safe inbound CONFIRM intents may auto-confirm eligible orders (server-side only).';


-- ============================================================
-- 2) Orders — Elevate confirmation metadata (never mutates supply fields)
-- ============================================================
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmation_source text
    CHECK (confirmation_source IS NULL OR confirmation_source IN ('whatsapp_auto', 'operator')),
  ADD COLUMN IF NOT EXISTS confirmed_by_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmation_message_id uuid,
  ADD COLUMN IF NOT EXISTS confirmation_conversation_id uuid,
  ADD COLUMN IF NOT EXISTS external_confirmation_status text NOT NULL DEFAULT 'not_applicable'
    CHECK (external_confirmation_status = 'not_applicable');

COMMENT ON COLUMN public.orders.confirmed_at IS
  'Elevate-side COD confirmation. Non-null means confirmed by Elevate (not supply status_name).';

COMMENT ON COLUMN public.orders.confirmation_source IS
  'whatsapp_auto | operator — who confirmed on the Elevate side.';

COMMENT ON COLUMN public.orders.external_confirmation_status IS
  'Phase 6 v1: not_applicable only. pending/synced/failed reserved for real outbound adapters.';

-- Tenant-safe FK targets require (id, workspace_id) unique indexes on WhatsApp tables.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_id_workspace_uidx
  ON public.whatsapp_messages (id, workspace_id);

-- whatsapp_conversations_id_workspace_uidx already exists from Phase 1 foundation.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_confirmation_message_workspace_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_confirmation_message_workspace_fkey
    FOREIGN KEY (confirmation_message_id, workspace_id)
    REFERENCES public.whatsapp_messages (id, workspace_id)
    ON DELETE RESTRICT;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_confirmation_conversation_workspace_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_confirmation_conversation_workspace_fkey
    FOREIGN KEY (confirmation_conversation_id, workspace_id)
    REFERENCES public.whatsapp_conversations (id, workspace_id)
    ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_orders_confirmed_at
  ON public.orders (workspace_id, confirmed_at)
  WHERE confirmed_at IS NOT NULL;


-- ============================================================
-- 3) Elevate confirmation audit (separate from supply order_events)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_confirmation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  order_uuid uuid,
  order_id bigint,
  event_type text NOT NULL
    CHECK (event_type IN ('confirmation_classified', 'order_confirmed')),
  source text NOT NULL
    CHECK (source IN ('whatsapp_auto', 'operator', 'system')),
  intent text
    CHECK (intent IS NULL OR intent IN ('confirm', 'reject', 'needs_operator')),
  reason text,
  conversation_id uuid,
  message_id uuid,
  actor_user_id uuid
    REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT order_confirmation_events_order_workspace_fkey
    FOREIGN KEY (order_uuid, workspace_id)
    REFERENCES public.orders (id, workspace_id)
    ON DELETE CASCADE,

  CONSTRAINT order_confirmation_events_conversation_workspace_fkey
    FOREIGN KEY (conversation_id, workspace_id)
    REFERENCES public.whatsapp_conversations (id, workspace_id)
    ON DELETE RESTRICT,

  CONSTRAINT order_confirmation_events_message_workspace_fkey
    FOREIGN KEY (message_id, workspace_id)
    REFERENCES public.whatsapp_messages (id, workspace_id)
    ON DELETE RESTRICT,

  CONSTRAINT order_confirmation_events_order_required_chk
    CHECK (
      event_type <> 'order_confirmed'
      OR (order_uuid IS NOT NULL AND order_id IS NOT NULL)
    ),

  CONSTRAINT order_confirmation_events_classified_message_chk
    CHECK (
      event_type <> 'confirmation_classified'
      OR message_id IS NOT NULL
    )
);

COMMENT ON TABLE public.order_confirmation_events IS
  'Elevate COD confirmation audit. UI timeline merges whatsapp_messages + these events.';

CREATE INDEX IF NOT EXISTS idx_order_confirmation_events_order
  ON public.order_confirmation_events (order_uuid, created_at DESC)
  WHERE order_uuid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_confirmation_events_conversation
  ON public.order_confirmation_events (conversation_id, created_at DESC)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_confirmation_events_workspace
  ON public.order_confirmation_events (workspace_id, created_at DESC);

-- One logical confirmation per order.
CREATE UNIQUE INDEX IF NOT EXISTS order_confirmation_events_one_confirm_uidx
  ON public.order_confirmation_events (order_uuid)
  WHERE event_type = 'order_confirmed';

-- Idempotent classification per inbound message.
CREATE UNIQUE INDEX IF NOT EXISTS order_confirmation_events_message_classify_uidx
  ON public.order_confirmation_events (message_id)
  WHERE event_type = 'confirmation_classified';

ALTER TABLE public.order_confirmation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_confirmation_events_select_own_workspace
  ON public.order_confirmation_events;

CREATE POLICY order_confirmation_events_select_own_workspace
  ON public.order_confirmation_events
  FOR SELECT
  TO authenticated
  USING (
    workspace_id IS NOT NULL
    AND public.user_owns_workspace(workspace_id)
  );

REVOKE ALL ON public.order_confirmation_events FROM PUBLIC;
GRANT SELECT ON public.order_confirmation_events TO authenticated;
GRANT ALL ON public.order_confirmation_events TO service_role;


-- ============================================================
-- 4) Record inbound classification (order optional)
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_confirmation_classification(
  p_workspace_id uuid,
  p_message_id uuid,
  p_conversation_id uuid,
  p_intent text,
  p_reason text DEFAULT NULL,
  p_order_uuid uuid DEFAULT NULL,
  p_source text DEFAULT 'system'
)
RETURNS TABLE (
  inserted boolean,
  event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock bigint;
  v_msg public.whatsapp_messages;
  v_conv public.whatsapp_conversations;
  v_order public.orders;
  v_event_id uuid;
BEGIN
  IF p_intent NOT IN ('confirm', 'reject', 'needs_operator') THEN
    RAISE EXCEPTION 'invalid_intent';
  END IF;

  IF p_source NOT IN ('whatsapp_auto', 'operator', 'system') THEN
    RAISE EXCEPTION 'invalid_source';
  END IF;

  IF p_message_id IS NULL OR p_conversation_id IS NULL THEN
    RAISE EXCEPTION 'message_and_conversation_required';
  END IF;

  SELECT * INTO v_conv
  FROM public.whatsapp_conversations c
  WHERE c.id = p_conversation_id
    AND c.workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation_not_found';
  END IF;

  SELECT * INTO v_msg
  FROM public.whatsapp_messages m
  WHERE m.id = p_message_id
    AND m.workspace_id = p_workspace_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'message_not_found';
  END IF;

  IF v_msg.conversation_id IS DISTINCT FROM p_conversation_id THEN
    RAISE EXCEPTION 'message_conversation_mismatch';
  END IF;

  IF v_msg.direction <> 'inbound' THEN
    RAISE EXCEPTION 'classification_requires_inbound_message';
  END IF;

  IF p_order_uuid IS NOT NULL THEN
    SELECT * INTO v_order
    FROM public.orders o
    WHERE o.id = p_order_uuid
      AND o.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'order_not_found';
    END IF;

    IF v_conv.order_id IS NOT NULL AND v_conv.order_id IS DISTINCT FROM p_order_uuid THEN
      RAISE EXCEPTION 'conversation_order_mismatch';
    END IF;
  END IF;

  v_lock := hashtext('classify:' || p_message_id::text);
  PERFORM pg_advisory_xact_lock(v_lock);

  SELECT e.id INTO v_event_id
  FROM public.order_confirmation_events e
  WHERE e.message_id = p_message_id
    AND e.event_type = 'confirmation_classified'
  LIMIT 1;

  IF FOUND THEN
    inserted := false;
    event_id := v_event_id;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.order_confirmation_events (
    workspace_id,
    order_uuid,
    order_id,
    event_type,
    source,
    intent,
    reason,
    conversation_id,
    message_id,
    metadata
  ) VALUES (
    p_workspace_id,
    p_order_uuid,
    CASE WHEN v_order.id IS NOT NULL THEN v_order.order_id ELSE NULL END,
    'confirmation_classified',
    p_source,
    p_intent,
    p_reason,
    p_conversation_id,
    p_message_id,
    jsonb_build_object(
      'ambiguous', p_order_uuid IS NULL
    )
  )
  RETURNING id INTO v_event_id;

  inserted := true;
  event_id := v_event_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.record_confirmation_classification(
  uuid, uuid, uuid, text, text, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_confirmation_classification(
  uuid, uuid, uuid, text, text, uuid, text
) TO service_role;


-- ============================================================
-- 5) Atomic confirm — one transition per order, supply fields untouched
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirm_order_cod(
  p_workspace_id uuid,
  p_order_uuid uuid,
  p_source text,
  p_conversation_id uuid DEFAULT NULL,
  p_message_id uuid DEFAULT NULL,
  p_actor_user_id uuid DEFAULT NULL,
  p_intent_reason text DEFAULT NULL
)
RETURNS TABLE (
  applied boolean,
  already_confirmed boolean,
  order_uuid uuid,
  confirmation_event_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock bigint;
  v_order public.orders;
  v_conv public.whatsapp_conversations;
  v_msg public.whatsapp_messages;
  v_event_id uuid;
BEGIN
  IF p_source NOT IN ('whatsapp_auto', 'operator') THEN
    RAISE EXCEPTION 'invalid_confirmation_source';
  END IF;

  IF p_source = 'whatsapp_auto' THEN
    IF p_message_id IS NULL OR p_conversation_id IS NULL THEN
      RAISE EXCEPTION 'whatsapp_auto_requires_inbound_evidence';
    END IF;
  ELSIF p_source = 'operator' THEN
    IF p_actor_user_id IS NULL THEN
      RAISE EXCEPTION 'operator_requires_actor';
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
  END IF;

  v_lock := hashtext('confirm_order:' || p_order_uuid::text);
  PERFORM pg_advisory_xact_lock(v_lock);

  SELECT * INTO v_order
  FROM public.orders o
  WHERE o.id = p_order_uuid
    AND o.workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_order.confirmed_at IS NOT NULL THEN
    applied := false;
    already_confirmed := true;
    order_uuid := v_order.id;
    confirmation_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_conversation_id IS NOT NULL THEN
    SELECT * INTO v_conv
    FROM public.whatsapp_conversations c
    WHERE c.id = p_conversation_id
      AND c.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'conversation_not_found';
    END IF;

    IF v_conv.order_id IS NOT NULL AND v_conv.order_id IS DISTINCT FROM p_order_uuid THEN
      RAISE EXCEPTION 'conversation_order_mismatch';
    END IF;

    IF p_source = 'whatsapp_auto' AND v_conv.order_id IS NULL THEN
      RAISE EXCEPTION 'conversation_not_linked_to_order';
    END IF;
  ELSIF p_source = 'whatsapp_auto' THEN
    RAISE EXCEPTION 'whatsapp_auto_requires_inbound_evidence';
  END IF;

  IF p_message_id IS NOT NULL THEN
    SELECT * INTO v_msg
    FROM public.whatsapp_messages m
    WHERE m.id = p_message_id
      AND m.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'message_not_found';
    END IF;

    IF p_source = 'whatsapp_auto' AND v_msg.direction <> 'inbound' THEN
      RAISE EXCEPTION 'whatsapp_auto_requires_inbound_message';
    END IF;

    IF v_msg.conversation_id IS DISTINCT FROM p_conversation_id THEN
      RAISE EXCEPTION 'message_conversation_mismatch';
    END IF;
  END IF;

  -- Eligibility: terminal / shipped supply labels — read-only check, no mutation.
  IF coalesce(v_order.status_name, '') ~* '(cancel|anulad|entreg|deliver|devolv|return|shipp|enviad|despach)'
     OR coalesce(v_order.details, '') ~* '(cancel|anulad|entreg|deliver|devolv|return|shipp|enviad|despach)' THEN
    RAISE EXCEPTION 'order_not_eligible';
  END IF;

  UPDATE public.orders o
  SET
    confirmed_at = now(),
    confirmation_source = p_source,
    confirmed_by_user_id = p_actor_user_id,
    confirmation_message_id = p_message_id,
    confirmation_conversation_id = p_conversation_id,
    external_confirmation_status = 'not_applicable',
    updated_at = now()
  WHERE o.id = p_order_uuid
    AND o.workspace_id = p_workspace_id
    AND o.confirmed_at IS NULL;

  IF NOT FOUND THEN
    applied := false;
    already_confirmed := true;
    order_uuid := p_order_uuid;
    confirmation_event_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.order_confirmation_events (
    workspace_id,
    order_uuid,
    order_id,
    event_type,
    source,
    intent,
    reason,
    conversation_id,
    message_id,
    actor_user_id,
    metadata
  ) VALUES (
    p_workspace_id,
    p_order_uuid,
    v_order.order_id,
    'order_confirmed',
    p_source,
    'confirm',
    p_intent_reason,
    p_conversation_id,
    p_message_id,
    p_actor_user_id,
    jsonb_build_object(
      'supply_status_name_at_confirm', v_order.status_name,
      'supply_details_at_confirm', v_order.details
    )
  )
  RETURNING id INTO v_event_id;

  applied := true;
  already_confirmed := false;
  order_uuid := p_order_uuid;
  confirmation_event_id := v_event_id;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_order_cod(
  uuid, uuid, text, uuid, uuid, uuid, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_cod(
  uuid, uuid, text, uuid, uuid, uuid, text
) TO service_role;

COMMIT;
