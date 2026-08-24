import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      let value = line.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return [line.slice(0, i).trim(), value];
    }),
);

const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
const eventsUrl = new URL(`${url}/rest/v1/order_events`);
eventsUrl.searchParams.set("select", "order_id,event_date,status_name,source,workspace_id,raw");
eventsUrl.searchParams.set("source", "ilike.*shopify*");
eventsUrl.searchParams.set("order", "event_date.desc");
eventsUrl.searchParams.set("limit", "2");

const res = await fetch(eventsUrl, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const body = await res.text();
console.log("events status", res.status);
const rows = JSON.parse(body);
if (!Array.isArray(rows) || rows.length === 0) {
  console.log(body.slice(0, 1500));
  process.exit(0);
}
const row = rows[0];
const raw = row.raw && typeof row.raw === "object" ? row.raw : {};
console.log("event columns", Object.keys(row).join(", "));
console.log("raw keys", Object.keys(raw).slice(0, 40));
console.log(
  JSON.stringify(
    {
      status_name: row.status_name,
      source: row.source,
      workspace_id: row.workspace_id,
      email: raw.email ?? null,
      customer: raw.customer ?? null,
      shipping_address: raw.shipping_address ?? null,
      billing_address: raw.billing_address ?? null,
      shipping_lines: Array.isArray(raw.shipping_lines)
        ? raw.shipping_lines.map((s) => s.title)
        : null,
      line_items: Array.isArray(raw.line_items)
        ? raw.line_items.map((i) => i.title || i.name).slice(0, 5)
        : null,
      phone: raw.phone ?? raw.shipping_address?.phone ?? raw.customer?.phone ?? null,
    },
    null,
    2,
  ),
);
