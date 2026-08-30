/**
 * Mirrors confirm_order_cod() supply eligibility regex in
 * supabase/migrations/20260828250000_whatsapp_cod_confirmation.sql
 * Keep in sync when changing RPC terminal/shipped guards.
 */
const SUPPLY_INELIGIBLE_PATTERN =
  /(cancel|anulad|entreg|deliver|devolv|return|shipp|enviad|despach)/i;

export function isSupplySnapshotIneligibleForCodConfirmation(input: {
  status_name: string | null;
  details: string | null;
}): boolean {
  const status = input.status_name ?? "";
  const details = input.details ?? "";
  return (
    SUPPLY_INELIGIBLE_PATTERN.test(status) || SUPPLY_INELIGIBLE_PATTERN.test(details)
  );
}
