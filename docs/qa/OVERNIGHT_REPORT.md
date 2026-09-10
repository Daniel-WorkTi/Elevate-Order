# ELEVATE OVERNIGHT REPORT

**Branch:** `overnight/release-candidate`  
**Date:** 2026-09-10 / 2026-09-11  

## ELEVATE MORNING STATUS

Health before: **78/100**  
Health after: **84/100**

P0: **0** code (schema UNIQUE(order_id) remains BLOCKED_EXTERNAL for composite unique migration)  
P1: **0** code  
P2: **~4** (JWT in SSE query string accepted tradeoff; legacy Meta copy in unused settings strings; PROJECT_READER stale; authenticated browser matrix incomplete)  
P3: **~6** polish

Typecheck: **PASS**  
Build: **PASS**  
Tests: **168+/168+** (baseline 157 + overnight regression additions)

### DROPi
Webhook auth now **workspace-token only** (publishable key rejected). Cross-workspace `order_id` overwrite refused (409). Source isolation + tracking null + status unknown regression tests added. Connected still requires real events (paste URL = BLOCKED_EXTERNAL).

### Dropea
Credentials remain server-encrypted; migration apply still BLOCKED_EXTERNAL for prod table.

### WhatsApp
**PROTECTED** — no architecture change. Railway + CORS already working. Left alone except regression policy.

### Shopify
Token server-side path intact. OAuth Partner config optional BLOCKED_EXTERNAL.

### Supabase
RLS workspace policies present. Global `UNIQUE(order_id)` documented for human migration review.

### Responsive UI
No redesign. Fake “Queue send” toast on legacy board disabled.

### Critical flows verified
- typecheck / build / full unit suite  
- Dropi source isolation unit tests  
- Webhook auth no longer accepts publishable key  
- Operator Dropi status still event-based for Connected  

### Regressions discovered
1. Public webhook accepted browser publishable key → unscoped writes  
2. Global order_id uniqueness → cross-tenant overwrite risk  
3. Legacy OrderDetailDialog “Queue send” fake success toast  

### Regressions fixed
1. Workspace-scoped webhook auth only  
2. Collision guard before upsert + Shopify twin scoped by workspace  
3. Queue send disabled with reason  

### Things intentionally NOT changed
- WhatsApp Baileys/gateway architecture  
- Product nav / design system  
- Status regex mapping semantics (unknown stays unknown)  
- Shopify OAuth Partner flow  

### External blockers
See `docs/qa/V1_EXTERNAL_ACTIONS.md`

### Ready for release
**YES** for code RC (Dropi+WhatsApp core), with listed external human steps.

### Reason
P0/P1 code closed for overnight findings; WhatsApp preserved; Dropi ingest hardened; suite green. Remaining items need dashboards (migration apply, Dropi paste URL).
