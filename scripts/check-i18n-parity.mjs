import fs from "node:fs";

function keys(p) {
  const s = fs.readFileSync(p, "utf8");
  return new Set([...s.matchAll(/"([^"]+)":/g)].map((x) => x[1]));
}

const en = keys("src/lib/i18n/locales/en.ts");
const pt = keys("src/lib/i18n/locales/pt.ts");
const onlyEn = [...en].filter((k) => !pt.has(k));
const onlyPt = [...pt].filter((k) => !en.has(k));
console.log(JSON.stringify({ en: en.size, pt: pt.size, onlyEn, onlyPt }, null, 2));
