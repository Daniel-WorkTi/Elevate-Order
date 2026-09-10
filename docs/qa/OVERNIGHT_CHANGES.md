# ELEVATE overnight changes

Branch: `overnight/release-candidate`

## Code

1. `src/lib/integrations/webhook-auth.ts` — remove publishable-key / unscoped ingest auth; workspace token required.
2. `src/lib/integrations/dropi/handle-public-orders-webhook.ts` — require workspaceId; refuse cross-workspace order_id collision; no Zod issues in 422; Shopify twin lookup scoped.
3. `src/lib/integrations/dropi/dropi.functions.ts` — authConfigured from workspace webhook endpoint (not publishable key).
4. `src/components/order-detail-dialog.tsx` — disable fake Queue send toast.
5. Tests: `source.test.ts`, `dropi-webhook-normalize.test.ts`, `webhook-auth.test.ts` + package.json registration.
6. Docs: OVERNIGHT_*, EXTERNAL_ACTIONS update (gateway live).

## Not changed

WhatsApp gateway implementation, nav, design tokens, Meta Cloud provider code isolation.
