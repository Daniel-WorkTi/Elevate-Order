import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { startGateway } from "./index.js";

function loadEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
loadEnv(join(root, ".env"));
loadEnv(join(root, ".env.local"));

const port = Number(process.env["WHATSAPP_GATEWAY_PORT"] ?? 8787);
startGateway(Number.isFinite(port) ? port : 8787);
