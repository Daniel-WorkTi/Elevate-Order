# ELEVATE V1 — External actions (human only)

These items **cannot** be completed by the agent without your credentials/dashboards.

1. **Apply Supabase migration** `supabase/migrations/20260910180000_workspace_provider_credentials.sql` on the production (and staging) database so Dropea credentials can be stored server-side.
2. **Confirm Vercel env** matches `docs/qa/V1_VERCEL_ENV_CHECKLIST.md` — especially `SUPABASE_*`, `PUBLIC_APP_URL`, `WHATSAPP_GATEWAY_URL`, `GATEWAY_INTERNAL_SECRET`, `WHATSAPP_TOKEN_ENCRYPTION_KEY` (used to encrypt Dropea secrets).
3. **WhatsApp gateway host** — see `docs/qa/V1_GATEWAY_SETUP.md` / Railway.
4. **Optional Shopify OAuth:** Partner app redirect URLs if using OAuth button (keys already on Vercel). Manual `shpat_` path works without Partner dashboard.
5. **Dropi:** paste the workspace webhook URL into Dropi / Zapier — Connected badge only turns green after real events arrive.
6. **Do not** set `NODE_TLS_REJECT_UNAUTHORIZED=0` on any production gateway host.
7. **Schema hardening (human review):** `orders.order_id` is still globally `UNIQUE`. Overnight code refuses cross-workspace overwrite (409), but a future migration to `UNIQUE (workspace_id, order_id)` should be reviewed before apply — not auto-applied.

### Progress (2026-09-10 overnight)

- [x] `WHATSAPP_PROVIDER` on Vercel Production + Preview
- [x] `GATEWAY_INTERNAL_SECRET` on Vercel Production + Preview
- [x] `WHATSAPP_TOKEN_ENCRYPTION_KEY` on Vercel
- [x] Shopify OAuth keys on Vercel
- [x] Railway WhatsApp gateway deployed (`elevate-order-production.up.railway.app`)
- [x] `WHATSAPP_GATEWAY_URL` set on Vercel Production + Preview
- [x] Gateway CORS allows `https://elevate-orders.vercel.app`
- [ ] Migration `20260910180000` applied on Supabase production
- [ ] Dropi webhook URL pasted in Dropi dashboard
- [ ] Optional: composite unique `(workspace_id, order_id)` migration review

No secret values are listed here on purpose.
