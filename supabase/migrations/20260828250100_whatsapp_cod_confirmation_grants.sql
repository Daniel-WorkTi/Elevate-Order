-- Phase 6 hotfix — RPC execute grants (PostgAPI / Supabase)
--
-- REVOKE FROM PUBLIC alone does not remove EXECUTE from authenticated/anon on
-- Supabase PostgREST. Browser JWT must not call SECURITY DEFINER confirmation RPCs.
--
-- Apply after 20260828250000_whatsapp_cod_confirmation.sql on remotes already migrated.
BEGIN;

REVOKE ALL ON FUNCTION public.confirm_order_cod(
  uuid, uuid, text, uuid, uuid, uuid, text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.record_confirmation_classification(
  uuid, uuid, uuid, text, text, uuid, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_order_cod(
  uuid, uuid, text, uuid, uuid, uuid, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.record_confirmation_classification(
  uuid, uuid, uuid, text, text, uuid, text
) TO service_role;

COMMIT;
