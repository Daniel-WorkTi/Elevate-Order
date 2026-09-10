# ELEVATE V1 — UX / UI Audit

**Auditor:** SENTINEL  
**Commit:** `bcf0f56`  
**Date:** 2026-09-10  
**Mode:** identify only — no redesign

---

## Canon compliance

| Canon rule | Observation | Severity |
| --- | --- | --- |
| Nav only Inbox/Orders/Templates/Profits/Connections | Shell matches | OK |
| No Pricing/Ads/Analytics in chrome | Legacy routes redirect only | OK |
| No fake search / notification bell | Not present in current shell | OK |
| WhatsApp green only on WA actions | Connect CTA uses brand blue `#2563EB` | P3 |
| Dropi/Dropea isolation | Shopify orders folded into Dropi tab | P1/P2 |
| Tokens canvas/surface/borders | Login + shell generally match | OK |
| PROJECT_READER / skill QA still describe old mock dashboard | Docs drift confuses operators/agents | P3 |

---

## Desktop / mobile / layout

| Area | Finding | Status |
| --- | --- | --- |
| Login | Strong brand panel; responsive language switcher | OK (runtime HTML) |
| Authenticated shell | Dense table layouts intended for 1440 | NOT_TESTABLE logged-in |
| Orders table | Horizontal overflow risk on narrow screens (typical) | UX_PROBLEM likely — NOT_TESTABLE |
| Inbox split list/chat | Mobile back pattern implemented | CODE_INFERENCE |
| Templates three panes | Mobile pane switcher exists | CODE_INFERENCE |
| Help | No entry in nav — discoverability fail | P3 |
| Dialogs/drawers | History sheet / delete dialogs present | CODE_INFERENCE |

---

## Loading / empty / error

| Surface | Finding |
| --- | --- |
| Orders | Empty + error + retry + link to connections | Good pattern (code) |
| Profits | Empty “show all time” / clear | Good pattern (code) |
| Connections | Webhook loading / error strings | May show eng. config copy |
| WhatsApp | Waiting for QR / reconnecting states | Implemented; placeholder copy stale |
| Settings test message | Fake “unavailable” toast path | Honest toast but dead feature |

---

## Copy / i18n

| Issue | Severity |
| --- | --- |
| PT/EN i18n broadly present | OK |
| QR placeholder still “próxima versão / next release” while QR works | P2 |
| Env var names in WhatsApp not-configured string | P2 |
| English “Server synchronization is not fully configured.” in connection summaries | P2 |
| Settings autoMessage vs Connections auto-confirm = two mental models | P2 |
| Onboarding “Connect” implies OAuth but only selects card | P1 UX honesty |

---

## Misleading success / status

| UI | Problem | Class |
| --- | --- | --- |
| Dropi Connected | Local flag only | MOCK + UX_PROBLEM |
| Dropea Connected | Local credentials flag | MOCK + UX_PROBLEM |
| Onboarding store connected feel | No backend | MOCK + UX_PROBLEM |
| Currency “select” on Profits | Read-only display of header currency | PARTIAL / UX |

---

## Button hierarchy / disabled states

| Finding | Notes |
| --- | --- |
| Track order disabled when no URL | Has reason (code) — good |
| WhatsApp send disabled without phone / not connected | Good |
| Dropi Connect not blocked by `serverReady` consistently | Mild UX_PROBLEM |
| WhatsApp Connect blue vs canon green | P3 |

---

## Visual / polish

| Item | Severity |
| --- | --- |
| Dead legacy components still in repo (ads/money/orders-board) | P3 (noise, not user-facing if unused) |
| Lint prettier mass failure | P3 tooling, not user-facing |
| Gateway TLS verify disabled in `gateway:dev` | Not UI — security (see master) |

---

## Responsive checklist (honest)

| Viewport | Tested? |
| --- | --- |
| Desktop login | Yes (HTML sample) |
| Desktop authenticated | No (auth wall) |
| Mobile authenticated | No |
| Overflow tables | Inferred risk only |
