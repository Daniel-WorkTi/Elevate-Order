-- Phase 5 — inbound conversations, unread, idempotent ingest RPC
BEGIN;

ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS unread_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_message_preview text;

COMMENT ON COLUMN public.whatsapp_conversations.unread_count IS
  'Inbound messages not yet viewed by an operator in the Inbox.';

COMMENT ON COLUMN public.whatsapp_conversations.last_message_preview IS
  'Truncated preview of the most recent message in the thread.';

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_conversations_connection_customer_uidx
  ON public.whatsapp_conversations (workspace_id, connection_id, customer_phone_e164);

-- Atomic inbound ingest: conversation reuse + message insert + unread bump.
CREATE OR REPLACE FUNCTION public.upsert_whatsapp_inbound_message(
  p_workspace_id uuid,
  p_connection_id uuid,
  p_external_message_id text,
  p_sender_phone_e164 text,
  p_message_body text,
  p_message_at timestamptz DEFAULT now()
)
RETURNS TABLE (
  inserted boolean,
  message_id uuid,
  conversation_id uuid,
  duplicate boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock bigint;
  v_conv_id uuid;
  v_msg_id uuid;
  v_preview text;
BEGIN
  IF p_external_message_id IS NULL OR length(trim(p_external_message_id)) = 0 THEN
    RAISE EXCEPTION 'external_message_id_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.whatsapp_connections c
    WHERE c.id = p_connection_id
      AND c.workspace_id = p_workspace_id
      AND c.provider = 'whatsapp_web'
  ) THEN
    RAISE EXCEPTION 'connection_not_found';
  END IF;

  v_lock := hashtext(p_connection_id::text || ':' || p_external_message_id);
  PERFORM pg_advisory_xact_lock(v_lock);

  SELECT m.id, m.conversation_id
  INTO v_msg_id, v_conv_id
  FROM public.whatsapp_messages m
  WHERE m.connection_id = p_connection_id
    AND m.whatsapp_message_id = p_external_message_id
  LIMIT 1;

  IF FOUND THEN
    inserted := false;
    duplicate := true;
    message_id := v_msg_id;
    conversation_id := v_conv_id;
    RETURN NEXT;
    RETURN;
  END IF;

  v_preview := left(coalesce(p_message_body, ''), 240);

  INSERT INTO public.whatsapp_conversations (
    workspace_id,
    connection_id,
    customer_phone_e164,
    status,
    last_message_at,
    last_message_preview,
    unread_count
  ) VALUES (
    p_workspace_id,
    p_connection_id,
    p_sender_phone_e164,
    'open',
    p_message_at,
    v_preview,
    1
  )
  ON CONFLICT (workspace_id, connection_id, customer_phone_e164)
  DO UPDATE SET
    last_message_at = GREATEST(
      COALESCE(public.whatsapp_conversations.last_message_at, p_message_at),
      p_message_at
    ),
    last_message_preview = EXCLUDED.last_message_preview,
    unread_count = public.whatsapp_conversations.unread_count + 1,
    status = 'open',
    updated_at = now()
  RETURNING id INTO v_conv_id;

  INSERT INTO public.whatsapp_messages (
    workspace_id,
    connection_id,
    conversation_id,
    whatsapp_message_id,
    direction,
    message_type,
    sender_phone_e164,
    message_body,
    status,
    created_at
  ) VALUES (
    p_workspace_id,
    p_connection_id,
    v_conv_id,
    p_external_message_id,
    'inbound',
    'text',
    p_sender_phone_e164,
    p_message_body,
    'received',
    p_message_at
  )
  RETURNING id INTO v_msg_id;

  inserted := true;
  duplicate := false;
  message_id := v_msg_id;
  conversation_id := v_conv_id;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_whatsapp_conversation_read(
  p_workspace_id uuid,
  p_conversation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_conversations c
  SET unread_count = 0, updated_at = now()
  WHERE c.id = p_conversation_id
    AND c.workspace_id = p_workspace_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_whatsapp_conversation(
  p_workspace_id uuid,
  p_connection_id uuid,
  p_customer_phone_e164 text,
  p_order_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  INSERT INTO public.whatsapp_conversations (
    workspace_id,
    connection_id,
    customer_phone_e164,
    order_id,
    status
  ) VALUES (
    p_workspace_id,
    p_connection_id,
    p_customer_phone_e164,
    p_order_id,
    'open'
  )
  ON CONFLICT (workspace_id, connection_id, customer_phone_e164)
  DO UPDATE SET
    order_id = COALESCE(public.whatsapp_conversations.order_id, EXCLUDED.order_id),
    updated_at = now()
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_whatsapp_inbound_message FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_whatsapp_conversation_read FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_whatsapp_conversation FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_whatsapp_inbound_message TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_whatsapp_conversation_read TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_whatsapp_conversation TO service_role;

COMMIT;
