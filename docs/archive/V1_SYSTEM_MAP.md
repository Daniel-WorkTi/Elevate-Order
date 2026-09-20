# ELEVATE V1 — System Map

**Auditor:** SENTINEL  
**Commit:** `bcf0f56`  
**Date:** 2026-09-10  
**Scope:** map only — no code changes

> Note: `PROJECT_READER.md` is **outdated** relative to current code (still describes mock Orders board, missing auth, stub QR). Prefer this map + the other `docs/qa/*` files.

---

## Product (canon)

Premium **operations** workspace: problematic orders → WhatsApp → incidents/tracking → profits.  
Nav ONLY: Inbox · Orders · Templates · Profits · Connections.

Stack: TanStack Start + React 19 + Tailwind 4 + Supabase + WhatsApp Web gateway (Baileys).

---

## Architecture (as implemented)

```
Dropi webhook ──┐
Dropea poll ────┼→ normalize → Supabase orders / order_events
Shopify sync ───┘                    │
                                     ├→ /orders (server fns, supply-filtered)
                                     ├→ /profits
WhatsApp gateway (Baileys) ←→ JWT/HMAC ←→ app (/api/internal/whatsapp/inbound)
                                     └→ Inbox conversations / messages
```

| Layer | Path | Role |
| --- | --- | --- |
| UI routes | `src/routes/*` | Pages + public/internal API handlers |
| Domain | `src/lib/order-domain.ts`, `src/lib/orders/*` | Status, supply, COD, tracking safety |
| Sync queries | `src/lib/synced-orders.functions.ts` | List/filter orders from Supabase |
| Integrations | `src/lib/integrations/{dropi,dropea,shopify}` | Webhook/normalize/sync |
| WhatsApp | `src/lib/whatsapp/**` + `services/whatsapp-gateway/` | Provider registry, send, inbound, QR |
| Supabase | `src/integrations/supabase/*` | Browser / SSR / service-role clients |
| Migrations | `supabase/migrations/*.sql` (19 files) | Schema through Phase 7 COD handled |

**Missing folders (expected by brief, not present):** `src/features`, `src/sync`.

---

## Route inventory

### Active product routes

| Route | Page | Purpose | Auth | Data source | Reachable from UI |
| --- | --- | --- | --- | --- | --- |
| `/` | Inbox | WhatsApp conversations | Yes | Supabase WA tables | Nav |
| `/orders` | Orders layout | Outlet | Yes | — | Nav |
| `/orders/` | Orders board | Operational queue | Yes | Supabase `orders` via `listSyncedOrders` | Nav |
| `/orders/$id` | Order detail | COD panel, message, tracking | Yes | Supabase order + events | Table / inbox |
| `/templates` | Templates | Message templates CRUD | Yes | Supabase `message_templates` | Nav |
| `/profits` | Profits | Financial view | Yes | Supabase orders aggregate | Nav |
| `/connections` | Hub | Integration cards | Yes | Status queries | Nav |
| `/connections/shopify` | Shopify | OAuth / token / sync | Yes | Shopify API + Supabase | Connections |
| `/connections/dropi` | Dropi | Webhook URL + local “linked” | Yes | Webhook URL server + localStorage flag | Connections |
| `/connections/dropea` | Dropea | Token + sync | Yes | Dropea API + localStorage creds | Connections |
| `/connections/whatsapp` | WhatsApp | QR connect / keywords / auto-confirm | Yes* | Gateway + Supabase | Connections (*onboarding-exempt) |
| `/settings` | Settings | Local prefs + links | Yes | localStorage | User menu |
| `/help` | Help | FAQ + support wa.me | Yes | Static | **No nav link** |
| `/login` | Login | Google OAuth | Public | Supabase Auth | Redirects |
| `/onboarding` | Onboarding | Store/WA/ready steps | Yes | Mixed | Auth gate |
| `/auth/google` | OAuth start | Google | Public | Supabase | Login |
| `/auth/callback` | OAuth callback | Session cookies | Public | Supabase | OAuth |
| `/auth/shopify` | Shopify OAuth | Install | Public | Shopify env | Connections |
| `/auth/shopify/callback` | Shopify callback | Store link | Public | Shopify + Supabase | OAuth |

### Legacy redirects (still exist)

| Route | Redirects to |
| --- | --- |
| `/analytics` | `/` |
| `/ads` | `/profits` |
| `/pricing` | `/` |
| `/integracao-api` | `/connections/dropi` |

### API routes

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET/POST /api/public/webhooks/orders` | API key / service role | Generic + Dropi-style ingest |
| `…/orders/$token` | Workspace token | Per-workspace webhook |
| `POST /api/public/webhooks/shopify` | Shopify HMAC | Shopify webhooks |
| `POST /api/internal/whatsapp/inbound` | HMAC (`WHATSAPP_INBOUND_HMAC_SECRET` or `GATEWAY_INTERNAL_SECRET`) | Gateway → app inbound |

### Gateway (separate process)

| Route | Purpose |
| --- | --- |
| `GET /health` | Health + feature flags |
| `POST /v1/sessions` | Start pairing |
| `GET /v1/sessions/:id/events` | SSE QR/status |
| `GET /v1/sessions/:id/status` | Status |
| `DELETE /v1/sessions/:id` | Disconnect |
| `POST /v1/messages` | Outbound text |

---

## Navigation (shell)

Source: `src/components/app-shell/navigation.ts`

1. Inbox → `/`  
2. Orders → `/orders`  
3. Templates → `/templates`  
4. Profits → `/profits`  
5. Connections → `/connections`  

Extra: Settings via user menu. Help has **no** chrome entry.

---

## Domain tables (Supabase)

`workspaces`, `shopify_stores`, `workspace_webhook_endpoints`, `message_templates`, `orders`, `order_events`, `order_confirmation_events`, `whatsapp_connections`, `whatsapp_connection_secrets`, `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_sessions`, `whatsapp_session_keys`

Notable RPCs: `mark_cod_operation_handled`, `confirm_order_cod`, `enqueue_whatsapp_outbound_message`, `upsert_whatsapp_inbound_message`, …

---

## Supply isolation

- UI: Dropi / Dropea tabs on Orders.  
- Query filter (`synced-orders.functions.ts`):  
  - **dropea** → `%dropea%`  
  - **shopify** → `%shopify%`  
  - **dropi** → `%dropi%` **OR** `%shopify%`  
- Implication: Shopify orders appear inside the **Dropi** operational tab (by design in code; conflicts with a strict reading of “never mix supplies”).

---

## Dead / legacy UI (not on active routes)

| Artifact | Notes |
| --- | --- |
| `src/lib/orders.ts` | Mock order array + wa.me helpers — **orphaned** from active Orders routes |
| `src/lib/inbox/inbox-demo.ts` | Demo inbox data — unused by current Inbox |
| `orders-board.tsx`, `order-detail-dialog.tsx` | Toast-only / mock board — unused |
| `meta-ads-panel.tsx`, `money-panel.tsx`, `profit-panel.tsx`, `analytics-charts.tsx` | Legacy dashboard pieces — unused |
| `whatsapp/_legacy/*` | Meta Embedded Signup — not in active Connections UI |

---

## Runtime environment used for this audit

| Check | Result |
| --- | --- |
| `npm test` | **150/150 pass** |
| `npm run build` | **PASS** |
| `npm run typecheck` | **FAIL** (13 TS errors) |
| `npm run lint` | **FAIL** (837 errors, mostly prettier) |
| Dev server | `https://localhost:8081/` **UP** |
| Gateway | `http://127.0.0.1:8787/health` **OK** (Baileys session restored) |
| Auth gate | Unauthenticated app routes → `/login` **OK** |
| Webhook GET | `200` probe OK |
| Webhook POST no key | `401` OK |
| Inbound no HMAC | `403` OK |

Authenticated UI deep-flows (orders filters, send message, mark handled) = **NOT_TESTABLE** in this pass without a live operator login session (no credentials used / no customer WhatsApp sends).
