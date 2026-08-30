import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env"), "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq <= 0) continue;
  const k = t.slice(0, eq);
  let v = t.slice(eq + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const { data, error } = await admin
  .from("orders")
  .update({
    cod_reply_intent: "confirm",
    cod_reply_at: "2026-08-30T10:51:03.79875+00:00",
    cod_reply_text: "SIM",
  })
  .eq("id", "4035d719-6159-4895-a986-3ba56bc9bf3a")
  .select("cod_reply_intent, cod_reply_text, cod_handled_at");

console.log("error", error?.message ?? null);
console.log("order", JSON.stringify(data, null, 2));
