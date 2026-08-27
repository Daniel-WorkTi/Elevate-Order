-- ============================================================
-- ELEVATE ORDERS
-- PHASE 0 — MULTI-TENANT FOUNDATION
-- FINAL VERSION ADAPTED TO CURRENT DATABASE
-- ============================================================

BEGIN;


-- ============================================================
-- 0. PREFLIGHT — VALIDATE TEXT WORKSPACE IDS
-- ============================================================

DO $$
DECLARE
  invalid_count integer;
BEGIN

  SELECT COUNT(*)
  INTO invalid_count
  FROM (

    SELECT workspace_id
    FROM public.orders
    WHERE workspace_id IS NOT NULL
      AND btrim(workspace_id) <> ''
      AND workspace_id !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

    UNION ALL

    SELECT workspace_id
    FROM public.order_events
    WHERE workspace_id IS NOT NULL
      AND btrim(workspace_id) <> ''
      AND workspace_id !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

    UNION ALL

    SELECT workspace_id
    FROM public.workspace_webhook_endpoints
    WHERE workspace_id IS NOT NULL
      AND btrim(workspace_id) <> ''
      AND workspace_id !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'

  ) invalid_rows;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION
      'PHASE 0 ABORTED: % invalid workspace_id values found.',
      invalid_count;
  END IF;

END $$;


-- ============================================================
-- 0.1 PREFLIGHT — MESSAGE TEMPLATE DUPLICATES
-- Current schema uses supply + kind.
-- ============================================================

DO $$
DECLARE
  duplicate_count integer;
BEGIN

  SELECT COUNT(*)
  INTO duplicate_count
  FROM (
    SELECT supply, kind
    FROM public.message_templates
    GROUP BY supply, kind
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION
      'PHASE 0 ABORTED: % duplicate message template groups found for (supply, kind).',
      duplicate_count;
  END IF;

END $$;


-- ============================================================
-- 1. WORKSPACES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Workspace',

  owner_user_id uuid
    REFERENCES auth.users(id)
    ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_workspaces_owner_user_id
ON public.workspaces(owner_user_id);


COMMENT ON TABLE public.workspaces IS
  'Operational tenant. Authorization is centralized through workspace access validation.';


COMMENT ON COLUMN public.workspaces.owner_user_id IS
  'NULL means orphan workspace. Non-null means owned workspace.';


-- ============================================================
-- 1.1 UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_workspaces_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_workspaces_updated_at
ON public.workspaces;


CREATE TRIGGER trg_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE PROCEDURE public.set_workspaces_updated_at();


-- ============================================================
-- 2. SHOPIFY WORKSPACES
--
-- IMPORTANT:
-- shopify_stores.workspace_id IS ALREADY UUID.
-- Do not use btrim() or regex on it.
-- ============================================================

INSERT INTO public.workspaces (
  id,
  name,
  owner_user_id,
  created_at,
  updated_at
)

SELECT DISTINCT
  s.workspace_id,

  COALESCE(
    NULLIF(
      trim(
        both FROM
        initcap(
          replace(
            replace(
              lower(COALESCE(s.shop_domain, '')),
              '.myshopify.com',
              ''
            ),
            '-',
            ' '
          )
        )
      ),
      ''
    ),
    'My Workspace'
  ),

  NULL::uuid,
  now(),
  now()

FROM public.shopify_stores s

WHERE s.workspace_id IS NOT NULL

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2.1 SHOPIFY OWNERSHIP CONFLICT REPORT
-- ============================================================

CREATE TEMP TABLE phase0_workspace_conflicts (
  workspace_id uuid NOT NULL,
  existing_owner uuid,
  contested_user uuid,
  shop_domain text
)
ON COMMIT DROP;


DO $$
DECLARE
  r record;
  current_owner uuid;
BEGIN

  FOR r IN

    SELECT
      s.user_id,
      s.workspace_id,
      s.shop_domain

    FROM public.shopify_stores s

    WHERE s.workspace_id IS NOT NULL
      AND s.user_id IS NOT NULL

  LOOP

    SELECT owner_user_id
    INTO current_owner
    FROM public.workspaces
    WHERE id = r.workspace_id;


    IF current_owner IS NULL THEN

      UPDATE public.workspaces

      SET
        owner_user_id = r.user_id,
        updated_at = now()

      WHERE id = r.workspace_id
        AND owner_user_id IS NULL;


    ELSIF current_owner = r.user_id THEN

      NULL;


    ELSE

      INSERT INTO phase0_workspace_conflicts (
        workspace_id,
        existing_owner,
        contested_user,
        shop_domain
      )

      VALUES (
        r.workspace_id,
        current_owner,
        r.user_id,
        r.shop_domain
      );

    END IF;

  END LOOP;

END $$;


-- ============================================================
-- 2.2 SHOPIFY STORES WITHOUT WORKSPACE
-- ============================================================

DO $$
DECLARE
  r record;
  new_id uuid;
  pretty_name text;
BEGIN

  FOR r IN

    SELECT
      s.id AS store_id,
      s.user_id,
      s.shop_domain

    FROM public.shopify_stores s

    WHERE s.workspace_id IS NULL
      AND s.user_id IS NOT NULL
      AND s.uninstalled_at IS NULL

  LOOP

    pretty_name := COALESCE(
      NULLIF(
        trim(
          both FROM
          initcap(
            replace(
              replace(
                lower(COALESCE(r.shop_domain, '')),
                '.myshopify.com',
                ''
              ),
              '-',
              ' '
            )
          )
        ),
        ''
      ),
      'My Workspace'
    );


    new_id := gen_random_uuid();


    INSERT INTO public.workspaces (
      id,
      name,
      owner_user_id,
      created_at,
      updated_at
    )

    VALUES (
      new_id,
      pretty_name,
      r.user_id,
      now(),
      now()
    );


    UPDATE public.shopify_stores
    SET workspace_id = new_id
    WHERE id = r.store_id;

  END LOOP;

END $$;


-- ============================================================
-- 3. PRESERVE ORPHAN WORKSPACES
--
-- orders/order_events/webhook workspace IDs are currently TEXT.
-- ============================================================

INSERT INTO public.workspaces (
  id,
  name,
  owner_user_id,
  created_at,
  updated_at
)

SELECT DISTINCT
  v.workspace_id,
  'My Workspace',
  NULL::uuid,
  now(),
  now()

FROM (

  SELECT workspace_id::uuid AS workspace_id
  FROM public.orders
  WHERE workspace_id IS NOT NULL
    AND btrim(workspace_id) <> ''


  UNION


  SELECT workspace_id::uuid
  FROM public.order_events
  WHERE workspace_id IS NOT NULL
    AND btrim(workspace_id) <> ''


  UNION


  SELECT workspace_id::uuid
  FROM public.workspace_webhook_endpoints
  WHERE workspace_id IS NOT NULL
    AND btrim(workspace_id) <> ''


  UNION


  SELECT workspace_id
  FROM public.shopify_stores
  WHERE workspace_id IS NOT NULL

) v

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 4. MIGRATION REPORT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.phase0_migration_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL,
  workspace_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);


ALTER TABLE public.phase0_migration_report
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON public.phase0_migration_report
FROM PUBLIC;


REVOKE ALL
ON public.phase0_migration_report
FROM anon;


REVOKE ALL
ON public.phase0_migration_report
FROM authenticated;


GRANT ALL
ON public.phase0_migration_report
TO service_role;


-- ORPHANS

INSERT INTO public.phase0_migration_report (
  kind,
  workspace_id,
  details
)

SELECT
  'orphan_workspace',
  w.id,
  jsonb_build_object(
    'name',
    w.name
  )

FROM public.workspaces w

WHERE w.owner_user_id IS NULL;


-- CLAIMED

INSERT INTO public.phase0_migration_report (
  kind,
  workspace_id,
  details
)

SELECT
  'claimed_workspace',
  w.id,
  jsonb_build_object(
    'owner_user_id',
    w.owner_user_id,
    'name',
    w.name
  )

FROM public.workspaces w

WHERE w.owner_user_id IS NOT NULL;


-- SHOPIFY CONFLICTS

INSERT INTO public.phase0_migration_report (
  kind,
  workspace_id,
  details
)

SELECT
  'shopify_owner_conflict',
  c.workspace_id,

  jsonb_build_object(
    'existing_owner',
    c.existing_owner,
    'contested_user',
    c.contested_user,
    'shop_domain',
    c.shop_domain
  )

FROM phase0_workspace_conflicts c;


-- PREFLIGHT AUDIT RESULT

INSERT INTO public.phase0_migration_report (
  kind,
  details
)

VALUES (
  'invalid_workspace_id_audit',

  jsonb_build_object(
    'orders_invalid', 0,
    'order_events_invalid', 0,
    'shopify_stores_invalid', 0,
    'workspace_webhook_endpoints_invalid', 0,
    'note',
    'Migration preflight found zero invalid workspace IDs.'
  )
);


-- ============================================================
-- 5. NORMALIZE EMPTY TEXT WORKSPACE IDS
-- ============================================================

UPDATE public.orders
SET workspace_id = NULL
WHERE workspace_id IS NOT NULL
  AND btrim(workspace_id) = '';


UPDATE public.order_events
SET workspace_id = NULL
WHERE workspace_id IS NOT NULL
  AND btrim(workspace_id) = '';


UPDATE public.workspace_webhook_endpoints
SET workspace_id = NULL
WHERE workspace_id IS NOT NULL
  AND btrim(workspace_id) = '';


-- shopify_stores skipped:
-- workspace_id already UUID.


-- ============================================================
-- 6. TEXT -> UUID
-- ============================================================

ALTER TABLE public.orders
ALTER COLUMN workspace_id
TYPE uuid
USING workspace_id::uuid;


ALTER TABLE public.order_events
ALTER COLUMN workspace_id
TYPE uuid
USING workspace_id::uuid;


ALTER TABLE public.workspace_webhook_endpoints
ALTER COLUMN workspace_id
TYPE uuid
USING workspace_id::uuid;


-- DO NOT ALTER shopify_stores.workspace_id.
-- It is already UUID.


-- ============================================================
-- 7. FOREIGN KEYS
-- ============================================================

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_workspace_id_fkey;


ALTER TABLE public.orders
ADD CONSTRAINT orders_workspace_id_fkey
FOREIGN KEY (workspace_id)
REFERENCES public.workspaces(id)
ON DELETE RESTRICT;


ALTER TABLE public.order_events
DROP CONSTRAINT IF EXISTS order_events_workspace_id_fkey;


ALTER TABLE public.order_events
ADD CONSTRAINT order_events_workspace_id_fkey
FOREIGN KEY (workspace_id)
REFERENCES public.workspaces(id)
ON DELETE RESTRICT;


ALTER TABLE public.shopify_stores
DROP CONSTRAINT IF EXISTS shopify_stores_workspace_id_fkey;


ALTER TABLE public.shopify_stores
ADD CONSTRAINT shopify_stores_workspace_id_fkey
FOREIGN KEY (workspace_id)
REFERENCES public.workspaces(id)
ON DELETE RESTRICT;


ALTER TABLE public.workspace_webhook_endpoints
DROP CONSTRAINT IF EXISTS workspace_webhook_endpoints_workspace_id_fkey;


ALTER TABLE public.workspace_webhook_endpoints
ADD CONSTRAINT workspace_webhook_endpoints_workspace_id_fkey
FOREIGN KEY (workspace_id)
REFERENCES public.workspaces(id)
ON DELETE RESTRICT;


-- ============================================================
-- 8. MESSAGE TEMPLATES
--
-- REAL SCHEMA:
-- supply + kind
-- No language column.
-- ============================================================

ALTER TABLE public.message_templates
ADD COLUMN IF NOT EXISTS workspace_id uuid
REFERENCES public.workspaces(id)
ON DELETE CASCADE;


COMMENT ON COLUMN public.message_templates.workspace_id IS
  'NULL = Elevate system template. UUID = workspace-specific template.';


ALTER TABLE public.message_templates
DROP CONSTRAINT IF EXISTS message_templates_kind_language_key;


ALTER TABLE public.message_templates
DROP CONSTRAINT IF EXISTS message_templates_kind_key;


ALTER TABLE public.message_templates
DROP CONSTRAINT IF EXISTS message_templates_supply_kind_key;


DROP INDEX IF EXISTS message_templates_system_kind_language_uidx;
DROP INDEX IF EXISTS message_templates_workspace_kind_language_uidx;


CREATE UNIQUE INDEX IF NOT EXISTS
message_templates_system_supply_kind_uidx

ON public.message_templates (
  supply,
  kind
)

WHERE workspace_id IS NULL;


CREATE UNIQUE INDEX IF NOT EXISTS
message_templates_workspace_supply_kind_uidx

ON public.message_templates (
  workspace_id,
  supply,
  kind
)

WHERE workspace_id IS NOT NULL;


CREATE INDEX IF NOT EXISTS
idx_message_templates_workspace_id

ON public.message_templates(workspace_id);


-- ============================================================
-- 9. WORKSPACE OWNERSHIP RLS HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_owns_workspace(
  ws_id uuid
)

RETURNS boolean

LANGUAGE sql

STABLE

SECURITY INVOKER

SET search_path = public

AS $$

  SELECT EXISTS (

    SELECT 1

    FROM public.workspaces w

    WHERE w.id = ws_id

      AND w.owner_user_id IS NOT NULL

      AND w.owner_user_id = auth.uid()

  );

$$;


COMMENT ON FUNCTION public.user_owns_workspace(uuid) IS
  'Returns true only when auth.uid() owns workspace. Orphans never match.';


REVOKE ALL
ON FUNCTION public.user_owns_workspace(uuid)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.user_owns_workspace(uuid)
TO authenticated;


GRANT EXECUTE
ON FUNCTION public.user_owns_workspace(uuid)
TO service_role;


-- ============================================================
-- 10. WORKSPACES RLS
-- ============================================================

ALTER TABLE public.workspaces
ENABLE ROW LEVEL SECURITY;


REVOKE ALL
ON public.workspaces
FROM PUBLIC;


REVOKE ALL
ON public.workspaces
FROM anon;


GRANT SELECT, INSERT, UPDATE
ON public.workspaces
TO authenticated;


GRANT ALL
ON public.workspaces
TO service_role;


DROP POLICY IF EXISTS workspaces_select_own
ON public.workspaces;


CREATE POLICY workspaces_select_own
ON public.workspaces
FOR SELECT
TO authenticated

USING (
  owner_user_id = auth.uid()
);


DROP POLICY IF EXISTS workspaces_insert_own
ON public.workspaces;


CREATE POLICY workspaces_insert_own
ON public.workspaces
FOR INSERT
TO authenticated

WITH CHECK (
  owner_user_id = auth.uid()
);


DROP POLICY IF EXISTS workspaces_update_own
ON public.workspaces;


CREATE POLICY workspaces_update_own
ON public.workspaces
FOR UPDATE
TO authenticated

USING (
  owner_user_id = auth.uid()
)

WITH CHECK (
  owner_user_id = auth.uid()
);


-- No DELETE permission for authenticated.


-- ============================================================
-- 11. ORDERS RLS
-- ============================================================

ALTER TABLE public.orders
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"Authenticated users can view orders"
ON public.orders;


DROP POLICY IF EXISTS
orders_select_own_workspace
ON public.orders;


CREATE POLICY orders_select_own_workspace
ON public.orders
FOR SELECT
TO authenticated

USING (
  workspace_id IS NOT NULL
  AND public.user_owns_workspace(workspace_id)
);


-- ============================================================
-- 12. ORDER EVENTS RLS
-- ============================================================

ALTER TABLE public.order_events
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"Authenticated users can view order events"
ON public.order_events;


DROP POLICY IF EXISTS
order_events_select_own_workspace
ON public.order_events;


CREATE POLICY order_events_select_own_workspace
ON public.order_events
FOR SELECT
TO authenticated

USING (
  workspace_id IS NOT NULL
  AND public.user_owns_workspace(workspace_id)
);


-- ============================================================
-- 13. MESSAGE TEMPLATES RLS
-- ============================================================

ALTER TABLE public.message_templates
ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS
"Authenticated users can view message templates"
ON public.message_templates;


DROP POLICY IF EXISTS
"Authenticated users can upsert message templates"
ON public.message_templates;


DROP POLICY IF EXISTS
message_templates_select_system_or_own
ON public.message_templates;


DROP POLICY IF EXISTS
message_templates_insert_own
ON public.message_templates;


DROP POLICY IF EXISTS
message_templates_update_own
ON public.message_templates;


DROP POLICY IF EXISTS
message_templates_delete_own
ON public.message_templates;


CREATE POLICY message_templates_select_system_or_own
ON public.message_templates
FOR SELECT
TO authenticated

USING (
  workspace_id IS NULL
  OR public.user_owns_workspace(workspace_id)
);


CREATE POLICY message_templates_insert_own
ON public.message_templates
FOR INSERT
TO authenticated

WITH CHECK (
  workspace_id IS NOT NULL
  AND public.user_owns_workspace(workspace_id)
);


CREATE POLICY message_templates_update_own
ON public.message_templates
FOR UPDATE
TO authenticated

USING (
  workspace_id IS NOT NULL
  AND public.user_owns_workspace(workspace_id)
)

WITH CHECK (
  workspace_id IS NOT NULL
  AND public.user_owns_workspace(workspace_id)
);


CREATE POLICY message_templates_delete_own
ON public.message_templates
FOR DELETE
TO authenticated

USING (
  workspace_id IS NOT NULL
  AND public.user_owns_workspace(workspace_id)
);


-- ============================================================
-- 14. SERVER-ONLY TABLES
-- ============================================================

-- shopify_stores:
-- remains server/service-role only.
--
-- workspace_webhook_endpoints:
-- remains server/service-role only.
--
-- No new authenticated/anon grants.


-- ============================================================
-- COMPLETE
-- ============================================================

COMMIT;
