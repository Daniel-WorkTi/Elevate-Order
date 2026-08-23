import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultContentFor } from "@/lib/templates/default-templates";
import {
  mergeTemplateOverrides,
  sortTemplates,
  templateRecordFromKind,
  type TemplateOverrideRow,
} from "@/lib/templates/template-merge";
import type { MessageTemplateRecord, TemplateKind } from "@/lib/templates/types";
import { validateTemplateContent } from "@/lib/templates/validate-template";

const SHARED_SUPPLY = "all";

const KINDS = new Set<TemplateKind>([
  "confirmation",
  "follow_up",
  "address_problem",
  "delivery_attempt",
  "tracking_update",
  "incident",
  "cancelled",
]);

function parseKind(value: unknown): TemplateKind {
  if (typeof value === "string" && KINDS.has(value as TemplateKind)) {
    return value as TemplateKind;
  }
  throw new Error("Invalid template kind");
}

type TemplateRow = {
  kind: string;
  content: string;
  name: string | null;
  description: string | null;
  updated_at: string | null;
};

function toOverride(row: TemplateRow): TemplateOverrideRow | null {
  if (!KINDS.has(row.kind as TemplateKind)) return null;
  return {
    kind: row.kind as TemplateKind,
    content: row.content,
    name: row.name,
    description: row.description,
    updated_at: row.updated_at,
  };
}

function defaultList(): MessageTemplateRecord[] {
  return sortTemplates(mergeTemplateOverrides([]));
}

export const listMessageTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
  async (): Promise<{ templates: MessageTemplateRecord[]; error: string | null }> => {
    const fallback = defaultList();

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows, error } = await supabaseAdmin
        .from("message_templates")
        .select("kind, content, name, description, updated_at");

      if (error) {
        console.error("listMessageTemplates failed", error);
        return {
          templates: fallback,
          error:
            "Could not read saved templates from Supabase. Showing defaults. If you just created the table, run the latest migration.",
        };
      }

      const overrides = ((rows ?? []) as TemplateRow[])
        .map(toOverride)
        .filter((row): row is TemplateOverrideRow => Boolean(row));

      return { templates: sortTemplates(mergeTemplateOverrides(overrides)), error: null };
    } catch (error) {
      console.error("listMessageTemplates failed", error);
      return {
        templates: fallback,
        error: "Unable to reach Supabase for templates. Showing defaults.",
      };
    }
  },
);

export const saveMessageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    const kind = parseKind(raw["kind"]);
    const content = typeof raw["content"] === "string" ? raw["content"] : "";
    return { kind, content };
  })
  .handler(
    async ({
      data,
    }): Promise<{ template: MessageTemplateRecord | null; error: string | null }> => {
      const validation = validateTemplateContent(data.content);
      if (!validation.ok) {
        return { template: null, error: validation.errors[0] ?? "Invalid template." };
      }

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const defaults = mergeTemplateOverrides([]);
        const base = defaults.find((t) => t.kind === data.kind);
        if (!base) return { template: null, error: "Unknown template kind." };

        const defaultBody = defaultContentFor(data.kind);

        if (data.content === defaultBody) {
          const { error: deleteError } = await supabaseAdmin
            .from("message_templates")
            .delete()
            .eq("kind", data.kind);

          if (deleteError) {
            console.error("saveMessageTemplate reset-delete failed", deleteError);
            return { template: null, error: "Unable to save template." };
          }

          return {
            template: templateRecordFromKind(data.kind, defaultBody, null),
            error: null,
          };
        }

        const updatedAt = new Date().toISOString();
        const { data: row, error } = await supabaseAdmin
          .from("message_templates")
          .upsert(
            {
              supply: SHARED_SUPPLY,
              kind: data.kind,
              name: base.name,
              description: base.description,
              content: data.content,
              updated_at: updatedAt,
            },
            { onConflict: "kind" },
          )
          .select("kind, content, updated_at")
          .maybeSingle();

        if (error) {
          console.error("saveMessageTemplate failed", error);
          return { template: null, error: "Unable to save template." };
        }

        return {
          template: templateRecordFromKind(
            data.kind,
            row?.content ?? data.content,
            row?.updated_at ?? updatedAt,
          ),
          error: null,
        };
      } catch (error) {
        console.error("saveMessageTemplate failed", error);
        return { template: null, error: "Unable to save template." };
      }
    },
  );

export const resetMessageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    return { kind: parseKind(raw["kind"]) };
  })
  .handler(async ({ data }) => {
    return saveMessageTemplate({
      data: {
        kind: data.kind,
        content: defaultContentFor(data.kind),
      },
    });
  });
