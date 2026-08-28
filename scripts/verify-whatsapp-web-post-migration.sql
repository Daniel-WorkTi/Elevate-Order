-- ============================================================
-- ELEVATE ORDERS — Post-migration gate (READ ONLY)
-- Migration: 20260828190000_whatsapp_web_provider.sql
-- Run entire block in Supabase SQL Editor. No DDL/DML.
-- ============================================================

WITH
counts AS (
  SELECT
    (SELECT COUNT(*)::int FROM public.whatsapp_connections) AS connections_total,
    (SELECT COUNT(*)::int FROM public.whatsapp_connections WHERE provider = 'meta_cloud') AS meta_cloud_total,
    (SELECT COUNT(*)::int FROM public.whatsapp_connections WHERE provider = 'whatsapp_web') AS whatsapp_web_total,
    (SELECT COUNT(*)::int FROM public.whatsapp_connection_secrets) AS secrets_total,
    (SELECT COUNT(*)::int FROM public.whatsapp_conversations) AS conversations_total,
    (SELECT COUNT(*)::int FROM public.whatsapp_messages) AS messages_total
),
tables_exist AS (
  SELECT
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'whatsapp_sessions'
    ) AS sessions_table,
    EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'whatsapp_session_keys'
    ) AS session_keys_table
),
rls AS (
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('whatsapp_sessions', 'whatsapp_session_keys')
),
privs AS (
  SELECT
    table_name,
    BOOL_OR(grantee = 'anon' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) AS anon_has_dml,
    BOOL_OR(grantee = 'authenticated' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) AS authenticated_has_dml,
    BOOL_OR(grantee = 'service_role' AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')) AS service_role_has_dml
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND table_name IN ('whatsapp_sessions', 'whatsapp_session_keys')
  GROUP BY table_name
),
indexes AS (
  SELECT
    EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'whatsapp_sessions'
        AND indexname = 'whatsapp_sessions_connection_uidx'
    ) AS sessions_connection_uidx,
    EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'whatsapp_session_keys_unique_key' AND contype = 'u'
    ) AS session_keys_composite_unique,
    EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'whatsapp_messages'
        AND indexname = 'whatsapp_messages_connection_external_id_uidx'
    ) AS messages_idempotency_idx,
    NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'whatsapp_connections'
        AND indexdef ILIKE '%UNIQUE%'
        AND indexdef ILIKE '%display_phone_number%'
    ) AS display_phone_not_globally_unique
),
fkeys AS (
  SELECT
    EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = 'public' AND rel.relname = 'whatsapp_sessions'
        AND con.contype = 'f' AND con.conname = 'whatsapp_sessions_connection_id_fkey'
        AND con.confdeltype = 'c'
    ) AS sessions_connection_cascade,
    EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = 'public' AND rel.relname = 'whatsapp_session_keys'
        AND con.contype = 'f' AND con.conname = 'whatsapp_session_keys_session_id_fkey'
        AND con.confdeltype = 'c'
    ) AS keys_session_cascade,
    EXISTS (
      SELECT 1 FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = rel.relnamespace
      WHERE n.nspname = 'public' AND rel.relname = 'whatsapp_sessions'
        AND con.contype = 'f' AND con.conname = 'whatsapp_sessions_workspace_id_fkey'
        AND con.confdeltype = 'r'
    ) AS sessions_workspace_restrict
),
realtime AS (
  SELECT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public' AND tablename = 'whatsapp_connections'
  ) AS connections_in_realtime
),
constraints AS (
  SELECT
    EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'whatsapp_connections_provider_chk'
        AND pg_get_constraintdef(oid) ILIKE '%whatsapp_web%'
        AND pg_get_constraintdef(oid) ILIKE '%meta_cloud%'
    ) AS provider_chk_ok,
    EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'whatsapp_connections_status_check'
        AND pg_get_constraintdef(oid) ILIKE '%qr_ready%'
        AND pg_get_constraintdef(oid) ILIKE '%reconnecting%'
        AND pg_get_constraintdef(oid) NOT ILIKE '%pending%'
    ) AS status_chk_ok
),
checks AS (
  SELECT 1 AS ord, '01_connections_total_9' AS check_id,
    CASE WHEN c.connections_total = 9 THEN 'PASS' ELSE 'FAIL' END AS result,
    c.connections_total::text AS detail FROM counts c
  UNION ALL SELECT 2, '02_all_legacy_meta_cloud',
    CASE WHEN c.connections_total = c.meta_cloud_total THEN 'PASS' ELSE 'FAIL' END,
    c.meta_cloud_total::text || '/' || c.connections_total::text FROM counts c
  UNION ALL SELECT 3, '03_zero_whatsapp_web_rows',
    CASE WHEN c.whatsapp_web_total = 0 THEN 'PASS' ELSE 'FAIL' END,
    c.whatsapp_web_total::text FROM counts c
  UNION ALL SELECT 4, '04_whatsapp_sessions_exists',
    CASE WHEN t.sessions_table THEN 'PASS' ELSE 'FAIL' END, NULL FROM tables_exist t
  UNION ALL SELECT 5, '05_whatsapp_session_keys_exists',
    CASE WHEN t.session_keys_table THEN 'PASS' ELSE 'FAIL' END, NULL FROM tables_exist t
  UNION ALL SELECT 6, '06_rls_sessions_enabled',
    CASE WHEN COALESCE((SELECT rls_enabled FROM rls WHERE table_name = 'whatsapp_sessions'), false) THEN 'PASS' ELSE 'FAIL' END, NULL
  UNION ALL SELECT 7, '07_rls_session_keys_enabled',
    CASE WHEN COALESCE((SELECT rls_enabled FROM rls WHERE table_name = 'whatsapp_session_keys'), false) THEN 'PASS' ELSE 'FAIL' END, NULL
  UNION ALL SELECT 8, '08_anon_no_access_sessions',
    CASE WHEN COALESCE((SELECT NOT anon_has_dml FROM privs WHERE table_name = 'whatsapp_sessions'), false) THEN 'PASS' ELSE 'FAIL' END, NULL
  UNION ALL SELECT 9, '09_authenticated_no_access_sessions',
    CASE WHEN COALESCE((SELECT NOT authenticated_has_dml FROM privs WHERE table_name = 'whatsapp_sessions'), false) THEN 'PASS' ELSE 'FAIL' END, NULL
  UNION ALL SELECT 10, '10_anon_no_access_session_keys',
    CASE WHEN COALESCE((SELECT NOT anon_has_dml FROM privs WHERE table_name = 'whatsapp_session_keys'), false) THEN 'PASS' ELSE 'FAIL' END, NULL
  UNION ALL SELECT 11, '11_authenticated_no_access_session_keys',
    CASE WHEN COALESCE((SELECT NOT authenticated_has_dml FROM privs WHERE table_name = 'whatsapp_session_keys'), false) THEN 'PASS' ELSE 'FAIL' END, NULL
  UNION ALL SELECT 12, '12_service_role_access_sessions',
    CASE WHEN COALESCE((SELECT service_role_has_dml FROM privs WHERE table_name = 'whatsapp_sessions'), false) THEN 'PASS' ELSE 'FAIL' END, NULL
  UNION ALL SELECT 13, '13_service_role_access_session_keys',
    CASE WHEN COALESCE((SELECT service_role_has_dml FROM privs WHERE table_name = 'whatsapp_session_keys'), false) THEN 'PASS' ELSE 'FAIL' END, NULL
  UNION ALL SELECT 14, '14_unique_connection_id_sessions',
    CASE WHEN i.sessions_connection_uidx THEN 'PASS' ELSE 'FAIL' END, NULL FROM indexes i
  UNION ALL SELECT 15, '15_unique_session_key_composite',
    CASE WHEN i.session_keys_composite_unique THEN 'PASS' ELSE 'FAIL' END, NULL FROM indexes i
  UNION ALL SELECT 16, '16_fk_connection_session_cascade',
    CASE WHEN f.sessions_connection_cascade THEN 'PASS' ELSE 'FAIL' END, NULL FROM fkeys f
  UNION ALL SELECT 17, '17_fk_session_keys_cascade',
    CASE WHEN f.keys_session_cascade THEN 'PASS' ELSE 'FAIL' END, NULL FROM fkeys f
  UNION ALL SELECT 18, '18_workspace_restrict_sessions',
    CASE WHEN f.sessions_workspace_restrict THEN 'PASS' ELSE 'FAIL' END, NULL FROM fkeys f
  UNION ALL SELECT 19, '19_display_phone_not_unique',
    CASE WHEN i.display_phone_not_globally_unique THEN 'PASS' ELSE 'FAIL' END, NULL FROM indexes i
  UNION ALL SELECT 20, '20_messages_idempotency_index',
    CASE WHEN i.messages_idempotency_idx THEN 'PASS' ELSE 'FAIL' END, NULL FROM indexes i
  UNION ALL SELECT 21, '21_connections_in_realtime',
    CASE WHEN r.connections_in_realtime THEN 'PASS' ELSE 'FAIL' END, NULL FROM realtime r
  UNION ALL SELECT 22, '22_provider_constraint',
    CASE WHEN c.provider_chk_ok THEN 'PASS' ELSE 'FAIL' END, NULL FROM constraints c
  UNION ALL SELECT 23, '23_status_constraint',
    CASE WHEN c.status_chk_ok THEN 'PASS' ELSE 'FAIL' END, NULL FROM constraints c
  UNION ALL SELECT 24, '24_connection_secrets_intact_2',
    CASE WHEN cnt.secrets_total = 2 THEN 'PASS' ELSE 'FAIL' END, cnt.secrets_total::text FROM counts cnt
  UNION ALL SELECT 25, '25_conversations_intact_2',
    CASE WHEN cnt.conversations_total = 2 THEN 'PASS' ELSE 'FAIL' END, cnt.conversations_total::text FROM counts cnt
  UNION ALL SELECT 26, '26_messages_intact_2',
    CASE WHEN cnt.messages_total = 2 THEN 'PASS' ELSE 'FAIL' END, cnt.messages_total::text FROM counts cnt
),
gate AS (
  SELECT
    CASE WHEN COUNT(*) FILTER (WHERE result = 'FAIL') = 0
      THEN 'POST-MIGRATION GATE: PASS'
      ELSE 'POST-MIGRATION GATE: FAIL'
    END AS gate,
    COUNT(*) FILTER (WHERE result = 'FAIL') AS fail_count
  FROM checks
)
SELECT check_id, result, detail FROM checks
UNION ALL
SELECT 'GATE', gate, fail_count::text FROM gate
ORDER BY 1;
