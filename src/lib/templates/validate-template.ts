import {
  extractPlaceholders,
  findMalformedPlaceholders,
  isVariableSupported,
} from "@/lib/templates/template-variables";

export type TemplateValidation = {
  ok: boolean;
  errors: string[];
  unsupported: string[];
};

export function validateTemplateContent(content: string): TemplateValidation {
  const errors: string[] = [];
  const trimmed = content.trim();

  if (!trimmed) {
    errors.push("Message cannot be empty.");
  }

  errors.push(...findMalformedPlaceholders(content));

  const unsupported = extractPlaceholders(content).filter((key) => !isVariableSupported(key));

  for (const key of unsupported) {
    errors.push(`Unknown variable: {{${key}}}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    unsupported,
  };
}
