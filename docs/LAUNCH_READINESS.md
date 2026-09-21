# ELEVATE — Launch Readiness

**Updated:** 2026-09-21 (morning consolidation)  
**Canon:** [PROJECT.md](../PROJECT.md) · [DESIGN.md](../DESIGN.md) · [CURRENT_STATE.md](./CURRENT_STATE.md)

---

## CURRENT STATUS

Launch hardening for multi-tenant isolation is **in place** at application + database layers.

| Area | Status |
| --- | --- |
| MULTI-TENANT | **PASS** |
| NEW ACCOUNT LIFECYCLE | **PASS** |
| SHOPIFY | **PASS** (external OAuth/env still required) |
| DROPI | **PASS** (external Dropi webhook config required) |
| DROPEA | **PASS** (external API key required) |
| WHATSAPP | **PASS** (Railway gateway + secrets required) |
| INBOX | **PASS** |
| ORDERS | **PASS** |
| PROFITS | **PASS** |
| SECURITY | **PASS** |
| EVENT IDEMPOTENCY | **PASS** (future writes; historical NULL status_id untouched) |
| LEGACY BETA | **PRESERVED** |

**LAUNCH READINESS: PARTIAL** — code + DB enforcement ready; prod still needs: empty-duplicate reconcile → UNIQUE(owner), apply `last_whatsapp_contact_at`, commit/push/deploy hardening, manual A/B + provider smoke.

---

## MULTI-TENANT

**PASS**

- Production: `UNIQUE(workspace_id, order_id)` / events composite unique where `workspace_id IS NOT NULL`
- Future ownership `CHECK … NOT VALID` active on orders, order_events, shopify_stores, workspaces
- Server reads/writes authorize via `authorizeWorkspaceInput` → owner match
- Same external `order_id` may coexist across workspaces
- Automated A/B isolation contracts: `src/lib/workspace/launch-e2e-isolation.test.ts`

---

## NEW ACCOUNT LIFECYCLE

**PASS**

- `ensureOwnedWorkspace` always sets `owner_user_id`; never claims ownerless legacy workspaces
- New accounts → onboarding gate; completed/grandfathered → app
- Skip (sessionStorage) ≠ Connected
- Logout → login returns owned workspace list (no orphan claim)
- Race: concurrent `ensureOwnedWorkspace` may create two owned workspaces (LOW non-blocker; no unique on owner)
- **App mitigation (2026-09-20):** never insert when any owned workspace exists; in-flight de-dupe; pick operational preference among duplicates. DB UNIQUE still **BLOCKED** until empty duplicates reconciled.

---

## SHOPIFY

**PASS** (ops-dependent)

- OAuth state cookie HMAC-signed when `SHOPIFY_API_SECRET` present
- Cookie binds `workspaceId`; callback persists store to that workspace
- Persist requires workspace; upsert on `(workspace_id, order_id)`
- Status / disconnect / sync / dashboard **require** authorized `workspaceId` (never fan-out across all owned stores)
- Custom public domain rejected with myshopify guidance
- No fake Connected without `shopify_stores` row

---

## DROPI

**PASS** (ops-dependent)

- Per-workspace opaque webhook token (`elevate_wh_` + entropy)
- Invalid token → 401, zero writes
- Token resolves workspace; writes stamp that workspace only
- Configured (checkbox/endpoint) ≠ Connected (first valid inbound event)
- Same Dropi `order_id` in A and B can coexist

---

## DROPEA

**PASS** (ops-dependent)

- Credentials encrypted at rest; never returned to client
- Sync authorizes workspace before loading token
- Upserts workspace-scoped; `eventStatusIdForUpsert` + ignoreDuplicates

---

## WHATSAPP

**PASS** (ops-dependent)

- App: workspace auth before QR/status/send
- Gateway: `assertConnectionOwnership` on session routes
- UI Connected only from backend/gateway status
- Do not reset Railway sessions as part of launch prep

---

## INBOX / ORDERS / PROFITS

**PASS**

- Queries filter authorized `workspace_id`
- Order detail enrichment of `order_events` now workspace-scoped (cross-tenant leak fixed)
- Recovery dashboard events workspace-scoped
- Supply tabs Dropi vs Dropea remain isolated
- Tracking URLs never invented when missing
- Profits workspace-scoped; empty/error/skeleton present

---

## SECURITY

**PASS**

- `SUPABASE_SERVICE_ROLE_KEY` server-only
- Client-provided workspace IDs authorized before use
- Fixed HIGH: `getSyncedOrder` event enrichment without workspace filter
- Fixed MED: unsigned OAuth cookie; Shopify status/disconnect not workspace-scoped
- Logs use `workspace_id` / provider / operation — not tokens or message bodies

---

## EVENT IDEMPOTENCY

**PASS** (future)

- `eventStatusIdForUpsert`: null → sentinel `0` so UNIQUE `(workspace_id, order_id, event_date, status_id)` collides
- Shopify / Dropi / Dropea ingest use sentinel + `ignoreDuplicates: true`
- Historical beta events with `status_id NULL` **not** rewritten

---

## LEGACY BETA

**PRESERVED**

- 49 orders with `workspace_id NULL` — do not delete/reassign
- 3 ownerless workspaces (`0cfdb02c…`, `18bd9cd4…`, `1d979bae…`) — do not delete/reassign
- **DO NOT** `VALIDATE` the NOT VALID check constraints until reconciliation

---

## KNOWN NON-BLOCKERS

- Onboarding completion still cookie/localStorage (forgeable UX gate, not data AuthZ)
- Concurrent `ensureOwnedWorkspace` race across isolates may still create duplicates until UNIQUE(owner_user_id) exists (app mitigation + in-flight Map narrows window)
- Legacy `ELEVATE_WEBHOOK_TOKEN` helper may still exist; ingest uses per-workspace tokens
- Meta Cloud WhatsApp paths deprecated/isolated (not in active UI)
- Live two-account E2E signup not executed in CI (contracts cover server boundaries)

---

## MANUAL TESTS STILL REQUIRED

1. Create **User A** and **User B** via normal signup on production/preview
2. Confirm each gets a distinct owned workspace; neither sees legacy beta orders
3. Connect independent Shopify / Dropi / Dropea where safely possible
4. Ingest same external `order_id` into A and B; verify isolation in Inbox/Orders/detail
5. Connect WhatsApp on A only; confirm B cannot use A’s connection
6. Shopify OAuth cancel/retry; Dropi invalid token → 401; Dropea bad key → human error
7. Confirm Connected states only after real backend/gateway truth

---

## TRUE LAUNCH BLOCKERS

**None in code/DB for multi-tenant safety** (as of this audit).

Ops prerequisites (not code blockers, but required for full product paths):

- Production env: Shopify keys, Dropi webhook reachability, Dropea keys, WhatsApp gateway URL + `GATEWAY_INTERNAL_SECRET`
- Confirm `20260920150000_orders_last_whatsapp_contact.sql` applied if contact-state UI depends on it

---

## PRODUCTION SAFETY

This launch-prep pass performed:

- **NO** production data deletes
- **NO** legacy reassignment
- **NO** `VALIDATE CONSTRAINT`
- **NO** production deploy / env mutation / WhatsApp session reset
