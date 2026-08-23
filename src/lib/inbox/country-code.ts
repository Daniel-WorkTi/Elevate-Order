const COUNTRY_CODES: Record<string, string> = {
  portugal: "pt",
  spain: "es",
  españa: "es",
  espana: "es",
  italy: "it",
  italia: "it",
  itália: "it",
  france: "fr",
  germany: "de",
  poland: "pl",
  polska: "pl",
  colombia: "co",
  mexico: "mx",
  méxico: "mx",
  chile: "cl",
  argentina: "ar",
  peru: "pe",
  perú: "pe",
  brazil: "br",
  brasil: "br",
  netherlands: "nl",
  belgium: "be",
  uk: "gb",
  "united kingdom": "gb",
};

/** Best-effort ISO 3166-1 alpha-2 for flags. Unknown countries return null. */
export function countryToFlagCode(country: string | null | undefined): string | null {
  const raw = country?.trim();
  if (!raw) return null;
  if (/^[a-z]{2}$/i.test(raw)) return raw.toLowerCase();
  return COUNTRY_CODES[raw.toLowerCase()] ?? null;
}
