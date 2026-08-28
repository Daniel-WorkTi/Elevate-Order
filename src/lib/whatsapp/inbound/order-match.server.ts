import { normalizePhoneToE164 } from "@/lib/whatsapp/phone-e164.server";

export type OrderMatchResult = {
  orderId: string | null;
  ambiguousOrderCount: number;
};

/** Match inbound phone to orders in the same workspace only. */
export async function matchOrderForInboundPhone(
  workspaceId: string,
  senderE164: string,
): Promise<OrderMatchResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rows, error } = await supabaseAdmin
    .from("orders")
    .select("id, phone, last_event_at")
    .eq("workspace_id", workspaceId)
    .not("phone", "is", null)
    .order("last_event_at", { ascending: false, nullsFirst: false })
    .limit(500);

  if (error || !rows?.length) {
    return { orderId: null, ambiguousOrderCount: 0 };
  }

  const matches = rows.filter((row) => {
    const normalized = normalizePhoneToE164(row.phone);
    return normalized === senderE164;
  });

  if (matches.length === 0) {
    return { orderId: null, ambiguousOrderCount: 0 };
  }

  if (matches.length === 1) {
    return { orderId: matches[0]!.id, ambiguousOrderCount: 0 };
  }

  return { orderId: null, ambiguousOrderCount: matches.length };
}
