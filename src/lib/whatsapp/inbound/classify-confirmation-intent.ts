import { normalizeConfirmationText } from "@/lib/whatsapp/inbound/normalize-confirmation-text";

export type ConfirmationIntent = "confirm" | "reject" | "needs_operator";

export type ClassificationResult = {
  intent: ConfirmationIntent;
  reason: string;
  normalizedText: string;
};

export type ConfirmationKeywordConfig = {
  confirmPhrases: string[];
  rejectPhrases: string[];
};

export const DEFAULT_CONFIRM_KEYWORDS = [
  "sim",
  "s",
  "confirmo",
  "confirmado",
  "sim confirmo",
  "pode enviar",
  "pode mandar",
  "ok pode enviar",
  "ok pode mandar",
  "quero sim",
  "sim quero",
  "esta confirmado",
  "yes",
  "y",
  "confirmed",
  "confirm",
  "si",
  "si confirmo",
  "de acuerdo",
];

export const DEFAULT_REJECT_KEYWORDS = [
  "nao",
  "n",
  "cancelar",
  "cancela",
  "pode cancelar",
  "nao quero",
  "nao desejo",
  "nao confirmo",
  "no",
  "cancel",
  "no quiero",
  "cancelar pedido",
];

const AMBIGUITY_PATTERNS = [
  /\smas\s/,
  /\sbut\s/,
  /\?/,
  /\btalvez\b/,
  /\bmaybe\b/,
  /\bnao sei\b/,
  /\bdont know\b/,
  /\bquanto\b/,
  /\bhow long\b/,
  /\bposso pagar\b/,
  /\bquero alterar\b/,
  /\bquero trocar\b/,
  /\bquero dois\b/,
  /\boriginal\b/,
  /\bligar\b/,
  /\bcall me\b/,
];

const CONFIRM_SUBPHRASES = ["pode enviar", "pode mandar", "confirmo", "sim confirmo", "si confirmo"];

const SHORT_AMBIGUOUS = new Set(["ok", "manda", "vale", "blz", "beleza"]);

function buildPhraseSet(phrases: string[]): Set<string> {
  const set = new Set<string>();
  for (const phrase of phrases) {
    const normalized = normalizeConfirmationText(phrase);
    if (normalized) set.add(normalized);
  }
  return set;
}

export function mergeConfirmationKeywordConfig(
  config?: Partial<ConfirmationKeywordConfig>,
): ConfirmationKeywordConfig {
  const confirm = [
    ...DEFAULT_CONFIRM_KEYWORDS,
    ...(config?.confirmPhrases ?? []).map((phrase) => phrase.trim()).filter(Boolean),
  ];
  const reject = [
    ...DEFAULT_REJECT_KEYWORDS,
    ...(config?.rejectPhrases ?? []).map((phrase) => phrase.trim()).filter(Boolean),
  ];
  return { confirmPhrases: confirm, rejectPhrases: reject };
}

function hasAmbiguityMarker(text: string): boolean {
  return AMBIGUITY_PATTERNS.some((pattern) => pattern.test(text));
}

function isEmojiOrEmptyNormalized(normalized: string, raw: string): boolean {
  if (!normalized) return true;
  const letters = raw.replace(/[^\p{L}\p{N}]/gu, "").trim();
  return letters.length === 0;
}

export function classifyConfirmationIntent(
  text: string,
  config?: Partial<ConfirmationKeywordConfig>,
): ClassificationResult {
  const normalizedText = normalizeConfirmationText(text);
  const merged = mergeConfirmationKeywordConfig(config);
  const confirmPhrases = buildPhraseSet(merged.confirmPhrases);
  const rejectPhrases = buildPhraseSet(merged.rejectPhrases);

  if (!text.trim() || isEmojiOrEmptyNormalized(normalizedText, text)) {
    return { intent: "needs_operator", reason: "empty_or_emoji", normalizedText };
  }

  if (SHORT_AMBIGUOUS.has(normalizedText) && !confirmPhrases.has(normalizedText)) {
    return { intent: "needs_operator", reason: "ambiguous_short", normalizedText };
  }

  if (hasAmbiguityMarker(normalizedText)) {
    return { intent: "needs_operator", reason: "ambiguous_compound", normalizedText };
  }

  if (confirmPhrases.has(normalizedText)) {
    return { intent: "confirm", reason: "exact_confirm_phrase", normalizedText };
  }

  if (rejectPhrases.has(normalizedText)) {
    return { intent: "reject", reason: "exact_reject_phrase", normalizedText };
  }

  const rejectPrefix = normalizedText.startsWith("nao ") || normalizedText.startsWith("no ");
  const hasConfirmSub = CONFIRM_SUBPHRASES.some((phrase) => normalizedText.includes(phrase));
  if (rejectPrefix && hasConfirmSub) {
    return { intent: "needs_operator", reason: "mixed_reject_confirm", normalizedText };
  }

  if (normalizedText.startsWith("sim ") && !confirmPhrases.has(normalizedText)) {
    return { intent: "needs_operator", reason: "sim_compound", normalizedText };
  }

  if (normalizedText.startsWith("nao ") && !rejectPhrases.has(normalizedText)) {
    return { intent: "needs_operator", reason: "nao_compound", normalizedText };
  }

  return { intent: "needs_operator", reason: "no_safe_match", normalizedText };
}

/** Parse textarea / comma-separated user input into keyword list. */
export function parseConfirmationKeywordInput(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\n,;]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 80),
    ),
  ];
}

export function formatConfirmationKeywordInput(keywords: string[]): string {
  return keywords.join("\n");
}
