/** Extract a user-facing message from a TanStack server-fn / WhatsApp error. */
export function whatsAppSendErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (msg !== "Error" && !/^unauthenticated$/i.test(msg)) return msg;
  }
  if (typeof error === "string" && error.trim()) return error.trim();
  return fallback;
}
