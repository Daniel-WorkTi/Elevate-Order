/** E.164 validation — aligned with DB constraint (+ then 6–15 digits). */
export function isE164Phone(value: string): boolean {
  return /^\+[0-9]{6,15}$/.test(value);
}
