# ELEVATE — Overnight Improvements Log

**Session start:** 2026-09-20  
**Mode:** autonomous continuous improvement (local only)  
**Last checkpoint:** ON-11…ON-35 (Shopify tenant, COD pending, templates/profits/recovery honesty, Connections ghost linked, FX honesty)

---

## Morning consolidation (2026-09-21)

- Diff review: PASS with one honesty fix — template `{{total}}` no longer invents EUR when currency missing
- `supabase/.temp/cli-latest` restored (not for commit)
- Gates re-probed READ-ONLY: duplicates still 2 owners; `last_whatsapp_contact_at` MISSING; Shopify local env MISSING
- Release tests: smoke/test/typecheck/build green (295)
- UNIQUE(owner) still BLOCKED; empty duplicates remain candidates only (no delete)
- Ready for human commit execution — not pushed/deployed

---

## Gate carry-over (duplicate owners)

| ID | AREA | SEVERITY | STATUS | ACTION |
| --- | --- | --- | --- | --- |
| GATE-01 | workspace | P1 | FIXED | `ensureOwnedWorkspace` never creates 2nd owned WS; in-flight de-dupe; pick by operational score |
| GATE-02 | workspace | P1 | BLOCKED | UNIQUE(owner_user_id) — 2 owners with duplicates in prod |
| GATE-03 | schema | P1 | BLOCKED | Apply `20260920150000_orders_last_whatsapp_contact.sql` in prod (SAFE_TO_APPLY) |
| GATE-04 | shopify | P2 | BLOCKED | Shopify env missing locally; Shopify-only impact |

See `docs/audit/duplicate-owner-forensics.json`.

---

## Metrics formulas

### Contacted order (operational)

- **Source:** `orders.last_whatsapp_contact_at IS NOT NULL`
- **Blocked until:** GATE-03

### Revenue / Profit / Margin

- **Revenue:** sum of order totals (workspace-scoped)
- **Currency:** ISO-3 only; missing → skip (ON-18)
- **Date range:** undated excluded (ON-19)
- **Costs:** METRIC_BLOCKED_BY_DATA_MODEL

### Recovery revenue / at-risk / recovered

- **Money:** only ISO-3 + finite total; missing → skip (not 0)
- **Cross-currency:** lock to first currency; mismatched currencies not summed (ON-24)
- **Date range:** undated excluded (ON-32)

---

## Work queue (session)

| ID | AREA | SEV | STATUS |
| --- | --- | --- | --- |
| ON-01…ON-10 | inbox/WA/profits | P0–P3 | FIXED (prior batch) |
| ON-11 | shopify dashboard WS scope | P1 | FIXED |
| ON-12 | shopify require workspaceId | P0 | FIXED |
| ON-13 | dropi_pending pagination | P1 | FIXED |
| ON-14 | disconnect ghost toast | P2 | FIXED |
| ON-15 | template invent EUR | P2 | FIXED |
| ON-17 | malformed placeholders | P2 | FIXED |
| ON-18 | profits null→EUR | P2 | FIXED |
| ON-19 | profits undated in range | P2 | FIXED |
| ON-20 | WA inbox empty on DB error | P2 | FIXED |
| ON-21 | missing WS col → empty success | P2 | FIXED |
| ON-22 | failed send cleared draft | P2 | FIXED |
| ON-23 | stale WA order_id send | P2 | FIXED |
| ON-24 | recovery currency mix | P2 | FIXED |
| ON-25 | country facet page-only | P3 | FIXED |
| ON-26 | supply=shopify remap | P3 | FIXED |
| ON-27 | template update WS defense | P2 | FIXED |
| ON-31 | Connections hub Linked for configured | P1 | FIXED |
| ON-32 | recovery undated in range | P1 | FIXED |
| ON-33 | order detail Shopify without WS | P1 | FIXED |
| ON-34 | formatStoredAmount invents FX | P1 | FIXED |
| ON-35 | profits/detail missing-WS empty success | P2 | FIXED |
| ON-36 | recovery events chunk fail → silent partial | P2 | FIXED |
| ON-16 | orphan labels on empty vars | P3 | DEFERRED |
| ON-29 | Shopify→Dropi inbox mapping | P3 | DEFERRED (product) |

---

## Validation (latest)

- npm test: **295 pass**
- typecheck: **pass**
- build: **pass**
- smoke:multi-tenant: **SMOKE_PASS**

PRODUCTION DATA MODIFIED: NO  
PRODUCTION MIGRATIONS APPLIED: NO  
DEPLOY/PUSH: NO

## Remaining blockers (human / prod)

1. Reconcile empty duplicate workspaces → UNIQUE(owner_user_id)
2. Apply `last_whatsapp_contact_at` migration in prod
3. Commit + push + deploy launch-hardening
4. Confirm Shopify envs on Vercel
5. Manual A/B signup E2E

## Next queue (safe leftovers / low)

- COD tab counts silent catch (cosmetic counts)
- Inbox contacted/uncontacted summaries after GATE-03
- Template orphan-label polish (ON-16)
- Product decision: Shopify orders in Dropi inbox queue (ON-29)

## Final discovery pass

Re-scanned Connections hub, order detail Shopify scope, recovery date/currency, FX display, silent empty success paths. Remaining meaningful work is **BLOCKED** (prod) or **DEFERRED** (product/low). Stopping per overnight stop criteria B.
