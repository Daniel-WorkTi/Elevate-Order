# ELEVATE overnight — manual checklist

## Before promoting RC

- [ ] Apply Supabase migration `20260910180000_workspace_provider_credentials.sql` in production SQL editor
- [ ] Confirm Vercel has `WHATSAPP_GATEWAY_URL=https://elevate-order-production.up.railway.app`
- [ ] Confirm Railway gateway `/health` returns ok
- [ ] Paste Dropi workspace webhook URL into Dropi notifications
- [ ] Send one Dropi test event → appears in Orders with correct source
- [ ] Connections → WhatsApp → QR connect (gateway only; stop local `gateway:dev`)
- [ ] Send one test WhatsApp to a **test** number only
- [ ] Verify Dropi tab never shows Shopify/Dropea rows
- [ ] Optional: review migration plan for `UNIQUE (workspace_id, order_id)` replacing global `order_id` unique

## Smoke UI

- [ ] Inbox / Orders / Templates / Profits / Connections load
- [ ] No Pricing / Analytics / Meta Ads in sidebar
- [ ] Order without tracking: no invented Track URL
- [ ] Dropea connect: token not in localStorage (Application tab)
