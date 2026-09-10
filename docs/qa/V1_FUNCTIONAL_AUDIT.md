# ELEVATE V1 — Functional Audit

**Auditor:** SENTINEL  
**Commit:** `bcf0f56`  
**Date:** 2026-09-10  
**Rule:** WORKING only if runtime-tested. Otherwise CODE_INFERENCE / NOT_TESTABLE.

---

## Quality gates (runtime)

| Gate | Status | Evidence |
| --- | --- | --- |
| Install | WORKING | `node_modules` present; scripts run |
| Dev server | WORKING | Vite ready `https://localhost:8081/` |
| Production build | WORKING | `npm run build` exit 0 |
| Unit tests | WORKING | `npm test` 150/150 |
| TypeScript | BROKEN | `tsc --noEmit` 13 errors (Inbox, Orders toolbar, onboarding, vite.config, hmac test) |
| Lint | BROKEN | 837 errors / 22 warnings — almost all `prettier/prettier` |

---

## Route test matrix

| Route | Loads? | Auth | Real/Mock/Partial | Console | Network | Visual | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/login` | WORKING 200 | Public | Real (Google OAuth UI) | Not instrumented browser | OK | OK | PT title “Iniciar sessão — ELEVATE Orders” |
| `/` Inbox | Auth redirect WORKING | Yes | Real code path | NOT_TESTABLE logged-in | 307→login | — | |
| `/orders/` | Auth redirect WORKING | Yes | Real Supabase code | NOT_TESTABLE | 307→login | — | Search defaults inject supply/codReply |
| `/orders/$id` | NOT_TESTABLE | Yes | Real | — | — | — | Needs auth + order id |
| `/templates` | Auth redirect WORKING | Yes | Real code | NOT_TESTABLE | →login | — | |
| `/profits` | Auth redirect WORKING | Yes | Real code | NOT_TESTABLE | →login | — | |
| `/connections/*` | Auth redirect WORKING | Yes | Mixed (see Connection audit) | NOT_TESTABLE | →login | — | |
| `/settings` | Auth redirect WORKING | Yes | Mostly MOCK | NOT_TESTABLE | →login | — | |
| `/help` | Auth redirect WORKING | Yes | Static | NOT_TESTABLE | →login | — | No nav link |
| `/onboarding` | Auth redirect WORKING | Yes | PARTIAL | NOT_TESTABLE | →login | — | Store cards don’t connect |
| `/analytics` `/ads` `/pricing` `/integracao-api` | Redirect WORKING | Yes | Legacy | →login | — | — | |
| Webhook orders GET | WORKING | Public probe | Real | — | 200 | — | |
| Webhook orders POST no auth | WORKING | Rejects | Real | — | 401 | — | |
| WA inbound no HMAC | WORKING | Rejects | Real | — | 403 | — | |
| Gateway `/health` | WORKING | Local | Real Baileys | — | 200 JSON phase 5 | — | Session restored on boot |

---

## Interactive element catalog

Statuses: **WORKING** = runtime; **CODE_INFERENCE_*** = code read; **NOT_TESTABLE** = needs auth/UI click without session.

### Shell

| ID | Element | Expected | Status | Evidence |
| --- | --- | --- | --- | --- |
| SHELL-NAV-001..005 | Nav links | Route to 5 canon pages | CODE_INFERENCE_WORKING | `navigation.ts` |
| SHELL-USER-001 | Settings | `/settings` | CODE_INFERENCE_WORKING | `user-menu.tsx` |
| SHELL-USER-002 | Sign out | Clears session | CODE_INFERENCE_WORKING | `signOutAuth` |
| SHELL-CCY-001 | Currency | Display FX | CODE_INFERENCE_PARTIAL | localStorage prefs |
| SHELL-LANG-001 | Language | PT/EN | WORKING (login page) | Login switcher renders PT/GB |

### Login

| ID | Element | Expected | Status | Evidence |
| --- | --- | --- | --- | --- |
| LOGIN-GOOGLE-001 | Continuar com Google | Start OAuth | CODE_INFERENCE_WORKING / CONFIG if Google misconfigured in Supabase | Button present in HTML 200 |
| LOGIN-HELP-001 | Support mailto | Opens mail | CODE_INFERENCE_WORKING | `mailto:support@elevate.orders` |

### Inbox `/`

| ID | Element | Expected | Status |
| --- | --- | --- | --- |
| INBOX-SEARCH-001 | Search | Filter list | NOT_TESTABLE |
| INBOX-FILTER-001..004 | Filters | Filter conversations | NOT_TESTABLE |
| INBOX-SEND-001 | Send | Gateway outbound | NOT_TESTABLE / CONFIG_ERROR if gateway down in prod |
| INBOX-SEL-004 | Delete selected | Server delete | NOT_TESTABLE |

### Orders

| ID | Element | Expected | Status | Notes |
| --- | --- | --- | --- | --- |
| ORDERS-SUPPLY-001 | Dropi/Dropea tabs | Isolate supply | CODE_INFERENCE_PARTIAL | Dropi tab also includes Shopify sources |
| ORDERS-REFRESH-001 | Refresh | Sync + refetch | CODE_INFERENCE_PARTIAL | Shopify sync; Dropea mostly refetch |
| ORDERS-COD-001..005 | COD tabs | Filter COD state | CODE_INFERENCE_WORKING | Server filter in `synced-orders` |
| ORDERS-SEARCH-001 | Search | Server q | NOT_TESTABLE |
| ORDERS-FILTER-* | Status/date/country/tracking | Server filters | NOT_TESTABLE |
| ORDERS-ROW-003 | Tracking link | External http(s) only | CODE_INFERENCE_WORKING | `safeTrackingHref` |
| ORD-COD-OP-001 | Abrir na Dropi | Open Dropi panel | CODE_INFERENCE_PARTIAL | Generic `/orders` URL, no deep-link |
| ORD-COD-OP-002 | Marcar tratado | RPC mark handled | NOT_TESTABLE |
| ORD-MSG-SEND-001 | Send in-app | Gateway | NOT_TESTABLE |
| ORD-MSG-WA-001 | wa.me fallback | Only if gateway not configured | CODE_INFERENCE_PARTIAL | `showWhatsAppMeFallback` |

### Connections / Settings / Templates / Profits / Onboarding

See detailed connection audit. Highlights:

| ID | Status | Why |
| --- | --- | --- |
| DROPI-CONN-001 Connect | MOCK | localStorage `elevate-dropi-connection` only |
| DROPEA-CONN-001 Connect | MOCK | Credentials in localStorage |
| DROPEA-SYNC-001 Sync | CODE_INFERENCE_WORKING | Calls Dropea API when token present |
| WA-CONN-001 Connect | CODE_INFERENCE_WORKING / CONFIG | Real gateway; health OK locally |
| SET-TEST-001 Test message | NOT_IMPLEMENTED | Toast only |
| SET-SAVE-001 Save | MOCK | localStorage |
| ONB-STORE-001 Connect cards | MOCK | Advances step only |
| TPL-SAVE-001 Save template | CODE_INFERENCE_WORKING | Server fn |
| PROF-* filters | NOT_TESTABLE | Auth required |

---

## Orders flow audit

| Case | Dropi | Dropea | Evidence class |
| --- | --- | --- | --- |
| Ingest new/updated | Webhook path real | Poll `syncDropeaOrders` real | CODE_INFERENCE + webhook auth runtime |
| Confirmed / incident / transit status | Heuristic `status_name` regex | Same domain mapper | CODE_INFERENCE |
| Messaged / unanswered | Message send + fields | Same | NOT_TESTABLE end-to-end |
| COD confirm reply | Phase 6–7 merge rules + tests | N/A Dropi-focused ops | Unit tests pass |
| COD handled | RPC migration Phase 7 | N/A | Migration present; UI NOT_TESTABLE |
| Supply mix | Shopify under Dropi tab | Isolated | CODE_INFERENCE_PARTIAL / UX |
| Search / date / facets | Server-side in list fn | Same | CODE_INFERENCE (PROJECT_READER wrong about date filter) |

Fields expected on OperationalOrder: customer, phone, source, order_id, status*, details, tracking_*, shipping_company, total, currency, last_event_at, COD fields — defined in `order-domain.ts`.

---

## Tracking audit

| Check | Status | Evidence |
| --- | --- | --- |
| Display tracking code | CODE_INFERENCE_WORKING | Order detail / columns |
| Tracking URL from order only | WORKING (unit + code) | `safeTrackingHref` rejects non-http(s) |
| Does not invent URL | WORKING | Explicit comment + tests carriers |
| Carrier website ≠ order tracking | WORKING | Carrier registry separate |
| Message includes same tracking | CODE_INFERENCE_WORKING | Template context uses order fields |
| Orders without tracking | CODE_INFERENCE_WORKING | Disabled track button / empty chips |

---

## WhatsApp wa.me audit

| Check | Status | Notes |
| --- | --- | --- |
| Primary product path | Gateway in-app when configured | `send-mode.ts` hides wa.me if gateway configured |
| Fallback wa.me | PARTIAL | `normalizeWhatsAppPhone` strips to digits; `buildWhatsAppLink` encodes text |
| E.164 for gateway | WORKING tests | `normalizePhoneToE164` rejects ambiguous local numbers |
| Customer message cross-leak | NOT_TESTABLE runtime | Template render uses single order context |
| Automated send to real customers | **Not performed** (policy) | |

Severity note: if a phone lacks country code, gateway path rejects; wa.me digits-only path may still open wrong country — **P2** when fallback active.

---

## Dead UI detected

| Item | Classification |
| --- | --- |
| Settings “Send test message” | NOT_IMPLEMENTED (toast) |
| Order detail dialog Queue send (legacy) | DEAD + toast |
| Dropi Connected badge | MOCK |
| Dropea Connected + secrets | MOCK storage |
| Onboarding store “Connect” | MOCK |
| Inbox demo / OrdersBoard mock | DEAD |
| i18n “Available in the next release” QR placeholder | UX_PROBLEM (copy stale; QR is implemented) |
| Help unreachable from nav | UX_PROBLEM |

---

## Severity roll-up (functional)

See `V1_MASTER_AUDIT.md` for full P0–P3 table.
