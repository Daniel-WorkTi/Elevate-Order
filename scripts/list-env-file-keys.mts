import { readFileSync, existsSync } from "node:fs";

for (const path of [".env", ".env.local"]) {
  if (!existsSync(path)) {
    console.log(path, "missing");
    continue;
  }
  const keys = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => l.slice(0, l.indexOf("=")));
  console.log(path + ":", keys.join(", "));
}
