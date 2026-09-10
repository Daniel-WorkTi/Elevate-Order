export type WhatsAppUserErrorCode =
  | "not_configured"
  | "cancelled"
  | "authorization_expired"
  | "phone_already_connected"
  | "workspace_already_connected"
  | "meta_unavailable"
  | "gateway_unavailable"
  | "validation_failed"
  | "encryption_unavailable"
  | "generic";

export class WhatsAppUserError extends Error {
  readonly code: WhatsAppUserErrorCode;

  constructor(code: WhatsAppUserErrorCode, message: string) {
    super(message);
    this.name = "WhatsAppUserError";
    this.code = code;
  }
}

const USER_MESSAGES: Record<WhatsAppUserErrorCode, string> = {
  not_configured: "WhatsApp ainda não está disponível. Contacte o suporte.",
  cancelled: "A conexão foi cancelada.",
  authorization_expired: "A autorização expirou. Tente conectar novamente.",
  phone_already_connected: "Este número já está conectado a outro workspace.",
  workspace_already_connected: "Este workspace já possui um WhatsApp conectado.",
  meta_unavailable: "Não foi possível conectar agora. Tente novamente.",
  gateway_unavailable: "O gateway WhatsApp não está disponível. Tente novamente.",
  validation_failed: "Não foi possível validar a autorização WhatsApp. Tente novamente.",
  encryption_unavailable: "WhatsApp ainda não está disponível. Contacte o suporte.",
  generic: "Não foi possível conectar agora. Tente novamente.",
};

export function whatsAppUserMessage(code: WhatsAppUserErrorCode): string {
  return USER_MESSAGES[code];
}

export function toWhatsAppUserError(error: unknown): WhatsAppUserError {
  if (error instanceof WhatsAppUserError) return error;

  if (error instanceof Error && error.name === "TokenCryptoError") {
    return new WhatsAppUserError("encryption_unavailable", USER_MESSAGES.encryption_unavailable);
  }

  const message = error instanceof Error ? error.message : String(error);

  if (message === "WHATSAPP_NOT_CONFIGURED" || message === "WHATSAPP_GATEWAY_NOT_CONFIGURED") {
    return new WhatsAppUserError("not_configured", USER_MESSAGES.not_configured);
  }

  if (/already linked|already connected|23505/i.test(message)) {
    if (/workspace already/i.test(message)) {
      return new WhatsAppUserError(
        "workspace_already_connected",
        USER_MESSAGES.workspace_already_connected,
      );
    }
    return new WhatsAppUserError("phone_already_connected", USER_MESSAGES.phone_already_connected);
  }

  if (/workspace already/i.test(message)) {
    return new WhatsAppUserError(
      "workspace_already_connected",
      USER_MESSAGES.workspace_already_connected,
    );
  }

  if (
    /expired|code has expired|authorization code has been used|code has been used/i.test(message)
  ) {
    return new WhatsAppUserError("authorization_expired", USER_MESSAGES.authorization_expired);
  }

  if (/debug_token|no whatsapp phone|authorized waba|granular_scopes/i.test(message)) {
    return new WhatsAppUserError("validation_failed", USER_MESSAGES.validation_failed);
  }

  if (/redirect_uri|redirect uri/i.test(message)) {
    return new WhatsAppUserError("meta_unavailable", USER_MESSAGES.meta_unavailable);
  }

  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network/i.test(message)) {
    return new WhatsAppUserError("gateway_unavailable", USER_MESSAGES.gateway_unavailable);
  }

  if (/gateway|WHATSAPP_GATEWAY|not_connected|gateway_send/i.test(message)) {
    return new WhatsAppUserError("gateway_unavailable", USER_MESSAGES.gateway_unavailable);
  }

  if (/send_failed|empty_message|invalid_recipient|message_too_long/i.test(message)) {
    return new WhatsAppUserError("generic", "Não foi possível enviar a mensagem. Tente novamente.");
  }

  if (/cancel/i.test(message)) {
    return new WhatsAppUserError("cancelled", USER_MESSAGES.cancelled);
  }

  if (/graph|meta|oauth|debug_token/i.test(message)) {
    return new WhatsAppUserError("meta_unavailable", USER_MESSAGES.meta_unavailable);
  }

  return new WhatsAppUserError("generic", USER_MESSAGES.generic);
}

export function sanitizeMetaErrorForLog(body: unknown): {
  meta_error_code?: number;
  meta_error_type?: string;
  meta_error_subcode?: number;
} {
  if (!body || typeof body !== "object") return {};
  const error = (body as { error?: Record<string, unknown> }).error;
  if (!error || typeof error !== "object") return {};
  const out: {
    meta_error_code?: number;
    meta_error_type?: string;
    meta_error_subcode?: number;
  } = {};
  if (typeof error["code"] === "number") out.meta_error_code = error["code"];
  if (typeof error["type"] === "string") out.meta_error_type = error["type"];
  if (typeof error["error_subcode"] === "number") out.meta_error_subcode = error["error_subcode"];
  return out;
}
