/** Compare two phone strings ignoring formatting. */
export function samePhoneE164(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  return a.replace(/\D/g, "") === b.replace(/\D/g, "");
}
