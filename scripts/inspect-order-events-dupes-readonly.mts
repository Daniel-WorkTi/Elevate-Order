/**
 * READ-ONLY: find order_events composite duplicate groups that block P0 migration.
 * Does not mutate data.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(resolve(process.cwd(), ".env.local"));

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Ev = {
  id: string;
  workspace_id: string | null;
  order_id: number;
  event_date: string;
  status_id: number | null;
  status_name: string | null;
  source: string | null;
  created_at: string;
  details: string | null;
  tracking_code: string | null;
};

async function fetchAllEvents(): Promise<Ev[]> {
  const pageSize = 1000;
  const rows: Ev[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("order_events")
      .select(
        "id, workspace_id, order_id, event_date, status_id, status_name, source, created_at, details, tracking_code",
      )
      .not("workspace_id", "is", null)
      .order("created_at", { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as Ev[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function keyOf(e: Ev): string {
  return `${e.workspace_id}::${e.order_id}::${e.event_date}::${e.status_id}`;
}

async function main() {
  const rows = await fetchAllEvents();
  console.log(`scanned non-null workspace events: ${rows.length}`);

  const groups = new Map<string, Ev[]>();
  for (const e of rows) {
    const k = keyOf(e);
    const list = groups.get(k) ?? [];
    list.push(e);
    groups.set(k, list);
  }

  const dupes = [...groups.entries()].filter(([, list]) => list.length > 1);
  console.log(`duplicate groups: ${dupes.length}\n`);

  for (const [k, list] of dupes) {
    const [workspace_id, order_id, event_date, status_id] = k.split("::");
    console.log("---");
    console.log(
      JSON.stringify({
        workspace_id,
        order_id: Number(order_id),
        event_date,
        status_id: status_id === "null" ? null : Number(status_id),
        count: list.length,
      }),
    );
    for (const e of list) {
      console.log(
        JSON.stringify({
          id: e.id,
          created_at: e.created_at,
          status_name: e.status_name,
          source: e.source,
          tracking_code: e.tracking_code,
          details: e.details?.slice(0, 80) ?? null,
        }),
      );
    }
  }

  // Also check if global unique (order_id, event_date, status_id) would already conflict across workspaces
  const global = new Map<string, Set<string>>();
  for (const e of rows) {
    const gk = `${e.order_id}::${e.event_date}::${e.status_id}`;
    const set = global.get(gk) ?? new Set();
    if (e.workspace_id) set.add(e.workspace_id);
    global.set(gk, set);
  }
  const crossWs = [...global.entries()].filter(([, set]) => set.size > 1);
  console.log(`\ncross-workspace same (order_id,event_date,status_id): ${crossWs.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
