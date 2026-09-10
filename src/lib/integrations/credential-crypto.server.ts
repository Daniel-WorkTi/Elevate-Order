import {
  decryptWhatsAppToken,
  encryptWhatsAppToken,
  TokenCryptoError,
} from "@/lib/whatsapp/providers/meta-cloud/token-crypto.server";

/**
 * Reuses AES-256-GCM helpers for supply integration secrets.
 * Prefers INTEGRATION_CREDENTIALS_ENCRYPTION_KEY, falls back to WhatsApp token key.
 */
export function getIntegrationCredentialEncryptionKey(): string {
  const key =
    process.env["INTEGRATION_CREDENTIALS_ENCRYPTION_KEY"]?.trim() ||
    process.env["WHATSAPP_TOKEN_ENCRYPTION_KEY"]?.trim();
  if (!key) {
    throw new TokenCryptoError(
      "invalid_key",
      "Integration credential encryption is not configured on this server.",
    );
  }
  return key;
}

export function encryptIntegrationSecret(plaintext: string): string {
  return encryptWhatsAppToken(plaintext, getIntegrationCredentialEncryptionKey());
}

export function decryptIntegrationSecret(ciphertext: string): string {
  return decryptWhatsAppToken(ciphertext, getIntegrationCredentialEncryptionKey());
}

export { TokenCryptoError };
