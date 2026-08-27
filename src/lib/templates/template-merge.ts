import {
  allDefaultTemplates,
  buildDefaultTemplates,
  defaultContentFor,
  DEFAULT_TEMPLATE_LANGUAGE,
  TEMPLATE_KIND_ORDER,
} from "@/lib/templates/default-templates";
import type { LanguageCode } from "@/lib/i18n/languages";
import type { MessageTemplateRecord, TemplateKind } from "@/lib/templates/types";

export type TemplateOverrideRow = {
  kind: TemplateKind;
  content: string;
  language?: LanguageCode | null;
  name?: string | null;
  description?: string | null;
  updated_at?: string | null;
};

export function mergeTemplateOverrides(
  overrides: TemplateOverrideRow[],
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
): MessageTemplateRecord[] {
  const map = new Map(
    overrides
      .filter((row) => !row.language || row.language === language)
      .map((row) => [row.kind, row]),
  );

  return allDefaultTemplates(language).map((base) => {
    const override = map.get(base.kind);
    if (!override) return base;
    const content = override.content;
    return {
      ...base,
      language,
      name: override.name?.trim() || base.name,
      description: override.description?.trim() || base.description,
      content,
      updatedAt: override.updated_at ?? null,
      isCustom: content !== defaultContentFor(base.kind, language),
    };
  });
}

export function sortTemplates(templates: MessageTemplateRecord[]): MessageTemplateRecord[] {
  const order = new Map(TEMPLATE_KIND_ORDER.map((kind, index) => [kind, index]));
  return [...templates].sort((a, b) => (order.get(a.kind) ?? 99) - (order.get(b.kind) ?? 99));
}

export function templateRecordFromKind(
  kind: TemplateKind,
  content: string,
  updatedAt: string | null,
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
): MessageTemplateRecord {
  const base = buildDefaultTemplates(language).find((t) => t.kind === kind);
  if (!base) throw new Error("Unknown template kind.");
  return {
    ...base,
    language,
    content,
    updatedAt,
    isCustom: content !== defaultContentFor(kind, language),
  };
}
