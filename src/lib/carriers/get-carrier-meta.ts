import { carrierRegistry } from "@/lib/carriers/carrier-registry";
import type { ResolvedCarrier } from "@/lib/carriers/carrier-types";
import { normalizeCarrierName } from "@/lib/carriers/normalize-carrier";

const aliasIndex = new Map<string, (typeof carrierRegistry)[number]>();
const hostIndex = new Map<string, (typeof carrierRegistry)[number]>();

for (const carrier of carrierRegistry) {
  for (const alias of carrier.aliases) {
    const key = normalizeCarrierName(alias);
    if (!key || aliasIndex.has(key)) continue;
    aliasIndex.set(key, carrier);
  }
  for (const host of carrier.trackingHosts ?? []) {
    const key = host.trim().toLowerCase();
    if (!key || hostIndex.has(key)) continue;
    hostIndex.set(key, carrier);
  }
}

const unknownLogged = new Set<string>();

function logUnknownCarrier(name: string) {
  if (import.meta.env?.DEV !== true) return;
  if (unknownLogged.has(name)) return;
  unknownLogged.add(name);
  console.debug("[ELEVATE] Unknown carrier:", name);
}

function toResolved(
  match: (typeof carrierRegistry)[number],
  fallbackName?: string,
): ResolvedCarrier {
  const resolved: ResolvedCarrier = {
    id: match.id,
    name: match.name || fallbackName || "",
    known: true,
    missing: false,
  };
  if (match.logo) resolved.logo = match.logo;
  if (match.website) resolved.website = match.website;
  return resolved;
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

  return toResolved(match);
}

/**
 * Infer carrier from a tracking URL hostname (e.g. inpost.pl → InPost).
 * Never invents a carrier from country/supply — only from the URL host.
 */
export function inferCarrierFromTrackingUrl(url?: string | null): ResolvedCarrier {
  const raw = url?.trim() ?? "";
  if (!raw) return { name: "", known: false, missing: true };

  let host = "";
  try {
    const href =
      raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
    host = new URL(href).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return { name: "", known: false, missing: true };
  }

  if (!host) return { name: "", known: false, missing: true };

  const exact = hostIndex.get(host);
  if (exact) return toResolved(exact);

  for (const [registered, carrier] of hostIndex) {
    if (host === registered || host.endsWith(`.${registered}`)) {
      return toResolved(carrier);
    }
  }

  return { name: "", known: false, missing: true };
}

/**
 * Prefer `shipping_company` from the order; if missing, infer from tracking URL.
 * Website comes from the registry when the carrier is known.
 */
export function resolveOrderCarrier(input: {
  shipping_company?: string | null;
  tracking_url?: string | null;
}): ResolvedCarrier {
  const fromName = getCarrierMeta(input.shipping_company);
  if (!fromName.missing) {
    if (fromName.known) return fromName;
    const fromUrl = inferCarrierFromTrackingUrl(input.tracking_url);
    if (fromUrl.known) {
      return {
        ...fromUrl,
        // Keep supply's raw label when present but unknown in registry
        name: fromName.name || fromUrl.name,
      };
    }
    return fromName;
  }

  return inferCarrierFromTrackingUrl(input.tracking_url);
}

/** Canonical name for UI/templates when known; otherwise the supply's original value. */
export function displayCarrierName(carrierName?: string | null): string {
  const resolved = getCarrierMeta(carrierName);
  if (resolved.missing) return "";
  return resolved.name;
}
