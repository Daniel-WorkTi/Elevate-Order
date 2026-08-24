import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const i = line.indexOf("=");
      let key = line.slice(0, i).trim();
      let value = line.slice(i + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return [key, value];
    }),
);

const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const key =
  env.SUPABASE_SERVICE_ROLE_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY;

const q = new URL(`${url}/rest/v1/orders`);
q.searchParams.set("select", "*");
q.searchParams.set("order", "updated_at.desc");
q.searchParams.set("limit", "2");

const res = await fetch(q, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const body = await res.text();
console.log("status", res.status);
const rows = JSON.parse(body);
if (!Array.isArray(rows)) {
  console.log(body.slice(0, 1500));
  process.exit(1);
}
for (const row of rows) {
  const snap = row.snapshot && typeof row.snapshot === "object" ? row.snapshot : {};
  console.log("columns", Object.keys(row).sort().join(", "));
  console.log(
    JSON.stringify(
      {
        id: row.id,
        order_id: row.order_id,
        shopify_order_id: row.shopify_order_id,
        source: row.source,
        workspace_id: row.workspace_id,
        customer_name: row.customer_name,
        phone: row.phone,
        email: row.email,
        address: row.address,
        city: row.city,
        postal_code: row.postal_code,
        country: row.country,
        product_summary: row.product_summary,
        status_name: row.status_name,
        shipping_company: row.shipping_company,
        tracking_code: row.tracking_code,
        snapType: typeof row.snapshot,
        snapKeys: Object.keys(snap).slice(0, 30),
        snapEmail: snap.email ?? null,
        snapCustomer: snap.customer ?? null,
        snapShip: snap.shipping_address ?? null,
        snapBill: snap.billing_address ?? null,
        snapLines: Array.isArray(snap.line_items)
          ? snap.line_items.map((i) => i.title || i.name).slice(0, 3)
          : null,
      },
      null,
      2,
    ),
  );
}
