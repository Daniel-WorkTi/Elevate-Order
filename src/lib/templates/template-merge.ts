import {
  allDefaultTemplates,
  buildDefaultTemplates,
  defaultContentFor,
  TEMPLATE_KIND_ORDER,
} from "@/lib/templates/default-templates";
import type { MessageTemplateRecord, TemplateKind } from "@/lib/templates/types";

export type TemplateOverrideRow = {
  kind: TemplateKind;
  content: string;
  name?: string | null;
  description?: string | null;
  updated_at?: string | null;
};

export function mergeTemplateOverrides(overrides: TemplateOverrideRow[]): MessageTemplateRecord[] {
  const map = new Map(overrides.map((row) => [row.kind, row]));

  return allDefaultTemplates().map((base) => {
    const override = map.get(base.kind);
    if (!override) return base;
    const content = override.content;
    return {
      ...base,
      name: override.name?.trim() || base.name,
      description: override.description?.trim() || base.description,
      content,
      updatedAt: override.updated_at ?? null,
      isCustom: content !== defaultContentFor(base.kind),
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
): MessageTemplateRecord {
  const base = buildDefaultTemplates().find((t) => t.kind === kind);
  if (!base) throw new Error("Unknown template kind.");
  return {
    ...base,
    content,
    updatedAt,
    isCustom: content !== defaultContentFor(kind),
  };
}
