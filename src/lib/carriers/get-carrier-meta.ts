import { carrierRegistry } from "@/lib/carriers/carrier-registry";
import type { ResolvedCarrier } from "@/lib/carriers/carrier-types";
import { normalizeCarrierName } from "@/lib/carriers/normalize-carrier";

const aliasIndex = new Map<string, (typeof carrierRegistry)[number]>();

for (const carrier of carrierRegistry) {
  for (const alias of carrier.aliases) {
    const key = normalizeCarrierName(alias);
    if (!key || aliasIndex.has(key)) continue;
    aliasIndex.set(key, carrier);
  }
}

const unknownLogged = new Set<string>();

function logUnknownCarrier(name: string) {
  if (import.meta.env?.DEV !== true) return;
  if (unknownLogged.has(name)) return;
  unknownLogged.add(name);
  console.debug("[ELEVATE] Unknown carrier:", name);
}

/** Resolves display metadata from the order's carrier name. Country/supply are ignored. */
export function getCarrierMeta(carrierName?: string | null): ResolvedCarrier {
  const raw = carrierName?.trim() ?? "";
  if (!raw) {
    return { name: "", known: false, missing: true };
  }

  const match = aliasIndex.get(normalizeCarrierName(raw));
  if (!match) {
    logUnknownCarrier(raw);
    return { name: raw, known: false, missing: false };
  }

  const resolved: ResolvedCarrier = {
    id: match.id,
    name: match.name,
    known: true,
    missing: false,
  };
  if (match.logo) resolved.logo = match.logo;
  return resolved;
}

/** Canonical name for UI/templates when known; otherwise the supply's original value. */
export function displayCarrierName(carrierName?: string | null): string {
  const resolved = getCarrierMeta(carrierName);
  if (resolved.missing) return "";
  return resolved.name;
}
