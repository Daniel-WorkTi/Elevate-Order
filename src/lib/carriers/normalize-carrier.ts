/** Visual lookup key only. Never assigns a carrier to an order. */
export function normalizeCarrierName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ");
}
