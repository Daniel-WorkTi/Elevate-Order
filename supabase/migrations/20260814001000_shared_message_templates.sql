-- Shared operational templates: one set for Dropi and Dropea.
-- Prefer an existing Dropi override when both supplies have the same kind.

DELETE FROM public.message_templates AS dropea
USING public.message_templates AS dropi
WHERE dropea.supply = 'dropea'
  AND dropi.supply = 'dropi'
  AND dropea.kind = dropi.kind;

UPDATE public.message_templates
SET supply = 'all'
WHERE supply IN ('dropi', 'dropea');

ALTER TABLE public.message_templates
  DROP CONSTRAINT IF EXISTS message_templates_supply_check;

ALTER TABLE public.message_templates
  ADD CONSTRAINT message_templates_supply_check
  CHECK (supply = 'all');

ALTER TABLE public.message_templates
  DROP CONSTRAINT IF EXISTS message_templates_supply_kind_key;

ALTER TABLE public.message_templates
  DROP CONSTRAINT IF EXISTS message_templates_kind_key;

ALTER TABLE public.message_templates
  ADD CONSTRAINT message_templates_kind_key UNIQUE (kind);
