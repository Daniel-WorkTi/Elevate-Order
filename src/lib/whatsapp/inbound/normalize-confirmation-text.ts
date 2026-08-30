/** Strip accents, punctuation, and collapse whitespace for deterministic phrase matching. */
export function normalizeConfirmationText(raw: string): string {
  return raw
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
