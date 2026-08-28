import { isE164Phone } from "@/lib/whatsapp/domain-types";

const MAX_E164_DIGITS = 15;
const MIN_E164_DIGITS = 6;

/**
 * Normalize a phone string to E.164 (+country + subscriber).
 * Does not invent a country code for ambiguous local numbers.
 */
export function normalizePhoneToE164(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;

  const trimmed = input.trim();

  if (isE164Phone(trimmed)) return trimmed;

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < MIN_E164_DIGITS || digits.length > MAX_E164_DIGITS) return null;

  // Explicit international prefix or full international digit string (e.g. 351912345678).
  if (hadPlus || digits.length >= 10) {
    const candidate = `+${digits}`;
    return isE164Phone(candidate) ? candidate : null;
  }

  return null;
}
