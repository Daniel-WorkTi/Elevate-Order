import { readFileSync, existsSync } from "node:fs";

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const url = (process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "").replace(/\/$/, "");
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";

async function tryEndpoint(path: string) {
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: "select 1 as ok" }),
  });
  const text = await res.text();
  console.log(path, res.status, text.slice(0, 200));
}

await tryEndpoint("/pg/query");
await tryEndpoint("/postgres/v1/query");
