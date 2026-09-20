---
name: elevate-web-qa
description: >-
  Testa as funções do sistema web ELEVATE Orders (Inbox, Orders, Templates,
  Profits, Connections, onboarding, settings, webhooks). Use when the user asks
  to test the web app, QA, regression, smoke test, or verificar funções Elevate.
---

# ELEVATE Web QA Agent

Teste manual/sistemático em `https://localhost:8081` (ou URL indicada).  
Porta default do `npm run dev`: **8081**.

## Before testing

1. Confirm `npm run dev` is up (and `npm run gateway:dev` if testing WhatsApp).
2. Read **PROJECT.md**, **DESIGN.md**, and **docs/CURRENT_STATE.md**.
3. Do **not** use `docs/archive/**` or deleted `PROJECT_READER.md` as current truth.
4. Never invent backend: if UI has no real source of truth, report **ghost feature** / mock — not a network bug.
5. Never expose or commit secrets (service role, WA tokens, `.env` values).

## Official nav (must match chrome)

1. Inbox `/`  
2. Orders `/orders`  
3. Templates `/templates`  
4. Profits `/profits`  
5. Connections `/connections`  

Also exercise when relevant: `/onboarding`, `/settings` (user menu), `/login`, `/orders/$id`.

**Do not** treat as active product QA: Pricing, Meta Ads, Analytics pages, fake global search, fake notification bell. Legacy redirects may still exist — confirm they redirect, don’t reintroduce pages.

## Progress checklist

```
QA Progress:
- [ ] Shell: nav 5 items, theme, 404
- [ ] Ghost feature scan
- [ ] Inbox /
- [ ] Orders /orders (+ detail)
- [ ] Templates /templates
- [ ] Profits /profits
- [ ] Connections hub + Dropi / Dropea / Shopify / WhatsApp
- [ ] Onboarding /onboarding
- [ ] Settings /settings
- [ ] Auth gate → /login
- [ ] Supply isolation Dropi ≠ Dropea
- [ ] Webhook / gateway smoke (if env allows)
```

### 1. Shell

- Sidebar: only Inbox, Orders, Templates, Profits, Connections.
- No Pricing / Ads / Analytics / Upgrade / fake search / fake bell.
- Theme toggle persists.
- Unknown route → 404 with home link.

### 2. Ghost feature detection

Fail the build/report if UI shows:

- Connected without backend/session/events proof  
- Syncing without an in-flight sync  
- Sent without provider ack / persisted result  
- Fake analytics KPIs  
- Fake automation progress  
- Fake notifications  

### 3. Inbox `/`

- WhatsApp conversation UI loads (auth required).
- Empty/loading/error states are honest.
- No Meta Embedded Signup chrome.

### 4. Orders `/orders`

- Supply tabs **[ Dropi ] [ Dropea ]** — queues never mixed.
- Data from Supabase server functions (not mock board).
- Open detail / drawer: tracking only if present; never invent URL.
- COD / message actions reflect real eligibility.

### 5. Templates `/templates`

- List/create/edit from real templates store.
- Preview uses placeholders — no fake send.

### 6. Profits `/profits`

- Aggregation may cross supplies **via filters**.
- Numbers from real order data; skeleton while loading.

### 7. Connections

For each of Shopify, Dropi, Dropea, WhatsApp:

- Status badge matches backend source of truth.  
- **Connected ≠ localStorage-only.**  
- Errors explain impact + next action.  
- WhatsApp: QR/session from gateway; disconnected/reconnecting must match session state.

### 8. Onboarding `/onboarding`

- Steps: Store → Order source → WhatsApp → Ready (target).
- Continue/disabled states must not claim Connected without proof.
- Same visual language as app (DESIGN.md).

### 9. Settings `/settings`

- Prefs that are local must not pretend to be server sync.
- Links to Connections for real integrations.

### 10. External smoke (optional)

- `POST /api/public/webhooks/orders` without auth → 401.  
- Inbound without HMAC → reject.  
- Gateway `GET /health` when testing WA.

## Report format

For each area: **PASS** | **FAIL** | **BLOCKED_EXTERNAL** | **GHOST_FEATURE**.  
Cite route + what source of truth was checked.  
No secrets in the report.
