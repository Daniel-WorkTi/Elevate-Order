import { buildDefaultTemplates } from "@/lib/templates/default-templates";
import { sortTemplates } from "@/lib/templates/template-merge";
import type { MessageTemplateRecord, TemplateKind } from "@/lib/templates/types";

/**
 * Sync fallbacks for first paint / SSR.
 * Real persistence goes through `src/lib/templates.functions.ts` → Supabase.
 */
export function loadTemplates(): MessageTemplateRecord[] {
  return sortTemplates(buildDefaultTemplates());
}

export function getTemplate(kind: TemplateKind): MessageTemplateRecord | null {
  return loadTemplates().find((t) => t.kind === kind) ?? null;
}
