# ELEVATE V1 HEALTH

**Auditor:** ORBIT overnight + SENTINEL/GUARD/RELAY  
**Branch:** `overnight/release-candidate`  
**Date:** 2026-09-10 overnight  

---

## Scoreboard

### Severity counts (code)

P0 code: **0**  
P1 code: **0**  
P0/P1 BLOCKED_EXTERNAL: migration apply, Dropi paste webhook, optional composite unique schema  
P2 remaining: **~4**  
P3 remaining: **~6**  

### Subsystem health

| Subsystem | Verdict |
| --- | --- |
| Supabase | HEALTHY (migration apply still external for credentials table) |
| Dropi | HEALTHY ingest auth hardened; Connected needs live events |
| Dropea | HEALTHY code path; credentials table migration external |
| WhatsApp Web Gateway | **WORKING** on Railway + CORS |
| Tracking | HEALTHY |
| Production build | **WORKING** |
| Typecheck | **WORKING** |
| Tests | **168/168** |

### Overall health score: **84 / 100**

Was **78**. Gain from webhook auth hardening, collision guard, gateway live, regression tests.

---

## Overnight issue table

| ID | Sev | Status | Summary |
| --- | --- | --- | --- |
| ON-001 | P0 | **FIXED** | Webhook no longer accepts publishable key / unscoped auth |
| ON-002 | P0 | **FIXED** (schema follow-up external) | Cross-workspace order_id overwrite refused |
| ON-003 | P1 | **FIXED** | Dropi authConfigured from workspace endpoint |
| ON-004 | P2 | **FIXED** | Legacy Queue send fake toast disabled |
| ON-005 | — | BLOCKED_EXTERNAL | Apply credentials migration |
| ON-006 | — | BLOCKED_EXTERNAL | Paste Dropi webhook in Dropi |
| ON-007 | — | BLOCKED_EXTERNAL | Review UNIQUE(workspace_id, order_id) migration |

## Critical re-audit passes

1. After webhook auth + collision guard + tests: no new P0/P1 **code** issues.  
2. After docs + Queue send fix + typecheck/tests: no new P0/P1 **code** issues.

## Document index

- `docs/qa/OVERNIGHT_BASELINE.md`
- `docs/qa/OVERNIGHT_REPORT.md`
- `docs/qa/OVERNIGHT_CHANGES.md`
- `docs/qa/OVERNIGHT_MANUAL_CHECKLIST.md`
- `docs/qa/V1_EXTERNAL_ACTIONS.md`
- `docs/qa/V1_RELEASE_REPORT.md`
