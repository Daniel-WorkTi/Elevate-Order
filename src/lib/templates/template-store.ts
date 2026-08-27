import {
  buildDefaultTemplates,
  DEFAULT_TEMPLATE_LANGUAGE,
} from "@/lib/templates/default-templates";
import { sortTemplates } from "@/lib/templates/template-merge";
import type { LanguageCode } from "@/lib/i18n/languages";
import type { MessageTemplateRecord, TemplateKind } from "@/lib/templates/types";

/**
 * Sync fallbacks for first paint / SSR.
 * Real persistence goes through `src/lib/templates.functions.ts` → Supabase.
 */
export function loadTemplates(
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
): MessageTemplateRecord[] {
  return sortTemplates(buildDefaultTemplates(language));
}

export function getTemplate(
  kind: TemplateKind,
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
): MessageTemplateRecord | null {
  return loadTemplates(language).find((t) => t.kind === kind) ?? null;
}
