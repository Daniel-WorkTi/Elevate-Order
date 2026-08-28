-- Phase 4 — outbound idempotency (client-side key before provider accepts)
BEGIN;

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS client_message_id uuid,
  ADD COLUMN IF NOT EXISTS send_started_at timestamptz;

COMMENT ON COLUMN public.whatsapp_messages.client_message_id IS
  'Client-generated idempotency key — one logical outbound send per workspace.';

COMMENT ON COLUMN public.whatsapp_messages.send_started_at IS
  'Set when gateway send begins — prevents concurrent double-send for same client_message_id.';

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_client_idempotency_uidx
  ON public.whatsapp_messages (workspace_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

-- Atomic enqueue + claim for concurrent requests with the same client_message_id.
CREATE OR REPLACE FUNCTION public.enqueue_whatsapp_outbound_message(
  p_workspace_id uuid,
  p_connection_id uuid,
  p_order_id uuid,
  p_client_message_id uuid,
  p_recipient_phone_e164 text,
  p_message_body text
)
RETURNS TABLE (
  message_id uuid,
  should_send boolean,
  status text,
  whatsapp_message_id text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock bigint;
  v_row public.whatsapp_messages;
  v_claimed boolean := false;
BEGIN
  IF p_client_message_id IS NULL THEN
    RAISE EXCEPTION 'client_message_id_required';
  END IF;

  v_lock := hashtext(p_workspace_id::text || ':' || p_client_message_id::text);
  PERFORM pg_advisory_xact_lock(v_lock);

  SELECT * INTO v_row
  FROM public.whatsapp_messages m
  WHERE m.workspace_id = p_workspace_id
    AND m.client_message_id = p_client_message_id
  LIMIT 1;

  IF FOUND THEN
    IF v_row.status = 'sent' OR v_row.whatsapp_message_id IS NOT NULL THEN
      message_id := v_row.id;
      status := v_row.status;
      whatsapp_message_id := v_row.whatsapp_message_id;
      should_send := false;
      RETURN NEXT;
      RETURN;
    END IF;

    IF v_row.status = 'failed' THEN
      UPDATE public.whatsapp_messages m
      SET
        status = 'queued',
        send_started_at = now(),
        failed_at = NULL,
        meta_error_code = NULL,
        meta_error_message = NULL,
        updated_at = now()
      WHERE m.id = v_row.id
        AND m.status = 'failed'
        AND m.whatsapp_message_id IS NULL
      RETURNING m.id INTO message_id;

      v_claimed := FOUND;
      message_id := COALESCE(message_id, v_row.id);
      status := 'queued';
      whatsapp_message_id := NULL;
      should_send := v_claimed;
      RETURN NEXT;
      RETURN;
    END IF;

    UPDATE public.whatsapp_messages m
    SET send_started_at = now(), updated_at = now()
    WHERE m.id = v_row.id
      AND m.status = 'queued'
      AND m.send_started_at IS NULL
      AND m.whatsapp_message_id IS NULL
    RETURNING m.id INTO message_id;

    v_claimed := FOUND;
    message_id := COALESCE(message_id, v_row.id);
    status := v_row.status;
    whatsapp_message_id := v_row.whatsapp_message_id;
    should_send := v_claimed;
    RETURN NEXT;
    RETURN;
  END IF;

  INSERT INTO public.whatsapp_messages (
    workspace_id,
    connection_id,
    order_id,
    client_message_id,
    direction,
    message_type,
    recipient_phone_e164,
    message_body,
    status,
    send_started_at
  ) VALUES (
    p_workspace_id,
    p_connection_id,
    p_order_id,
    p_client_message_id,
    'outbound',
    'text',
    p_recipient_phone_e164,
    p_message_body,
    'queued',
    now()
  )
  RETURNING id, whatsapp_messages.status, whatsapp_messages.whatsapp_message_id
  INTO message_id, status, whatsapp_message_id;

  should_send := true;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_whatsapp_outbound_message FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_whatsapp_outbound_message TO service_role;

COMMIT;
