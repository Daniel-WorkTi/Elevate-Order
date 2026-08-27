import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { defaultContentFor, resolveTemplateLanguage } from "@/lib/templates/default-templates";
import {
  mergeTemplateOverrides,
  sortTemplates,
  templateRecordFromKind,
  type TemplateOverrideRow,
} from "@/lib/templates/template-merge";
import type { LanguageCode } from "@/lib/i18n/languages";
import type { MessageTemplateRecord, TemplateKind } from "@/lib/templates/types";
import { validateTemplateContent } from "@/lib/templates/validate-template";
import { authorizeWorkspaceInput } from "@/lib/workspace/authorize-workspace-input";
import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";

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
  workspace_id?: string | null;
};

function toOverride(row: TemplateRow, language: LanguageCode): TemplateOverrideRow | null {
  if (!KINDS.has(row.kind as TemplateKind)) return null;
  // DB schema has no language column; UI language only affects default merge.
  return {
    kind: row.kind as TemplateKind,
    content: row.content,
    language,
    name: row.name,
    description: row.description,
    updated_at: row.updated_at,
  };
}

function defaultList(language: LanguageCode): MessageTemplateRecord[] {
  return sortTemplates(mergeTemplateOverrides([], language));
}

async function loadTemplateRows(
  supabaseAdmin: SupabaseClient<Database>,
  workspaceId: string | null,
): Promise<{ rows: TemplateRow[]; errorMessage: string | null }> {
  // System templates (workspace_id IS NULL) + optional workspace overrides.
  // Unique key is supply + kind (+ workspace_id). No language column on remote.
  let query = supabaseAdmin
    .from("message_templates")
    .select("kind, content, name, description, updated_at, workspace_id");

  if (workspaceId) {
    query = query.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`);
  } else {
    query = query.is("workspace_id", null);
  }

  const result = await query;
  if (result.error) {
    return { rows: [], errorMessage: result.error.message };
  }

  const rows = (result.data ?? []) as TemplateRow[];
  // Prefer workspace override over system for the same kind.
  const byKind = new Map<string, TemplateRow>();
  for (const row of rows) {
    if (!row.workspace_id) {
      if (!byKind.has(row.kind)) byKind.set(row.kind, row);
      continue;
    }
    if (workspaceId && row.workspace_id === workspaceId) {
      byKind.set(row.kind, row);
    }
  }
  return { rows: [...byKind.values()], errorMessage: null };
}

export const listMessageTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => {
    const raw = (data ?? {}) as Record<string, unknown>;
    return {
      language: resolveTemplateLanguage(raw["language"]),
      workspaceId: typeof raw["workspaceId"] === "string" ? raw["workspaceId"] : "",
    };
  })
  .handler(
    async ({
      context,
      data,
    }): Promise<{ templates: MessageTemplateRecord[]; error: string | null }> => {
      const language = data.language;
      const fallback = defaultList(language);
      let workspaceId: string | null = null;
      const parsed = parseWorkspaceId(data.workspaceId);
      if (parsed) {
        workspaceId = (await authorizeWorkspaceInput(context.userId, parsed)).id;
      }

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { rows, errorMessage } = await loadTemplateRows(supabaseAdmin, workspaceId);

        if (errorMessage) {
          console.error("listMessageTemplates failed", errorMessage);
          return {
            templates: fallback,
            error:
              "Could not read saved templates from Supabase. Showing defaults. If you just created the table, run the latest migration.",
          };
        }

        const overrides = rows
          .map((row) => toOverride(row, language))
          .filter((row): row is TemplateOverrideRow => Boolean(row));

        return {
          templates: sortTemplates(mergeTemplateOverrides(overrides, language)),
          error: null,
        };
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
    const language = resolveTemplateLanguage(raw["language"]);
    return {
      kind,
      content,
      language,
      workspaceId: typeof raw["workspaceId"] === "string" ? raw["workspaceId"] : "",
    };
  })
  .handler(
    async ({
      context,
      data,
    }): Promise<{ template: MessageTemplateRecord | null; error: string | null }> => {
      const validation = validateTemplateContent(data.content);
      if (!validation.ok) {
        return { template: null, error: validation.errors[0] ?? "Invalid template." };
      }

      const workspaceId = (await authorizeWorkspaceInput(context.userId, data.workspaceId)).id;

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const defaults = mergeTemplateOverrides([], data.language);
        const base = defaults.find((t) => t.kind === data.kind);
        if (!base) return { template: null, error: "Unknown template kind." };

        const defaultBody = defaultContentFor(data.kind, data.language);

        if (data.content === defaultBody) {
          // Reset = delete workspace override only (never touch system rows).
          const { error: deleteError } = await supabaseAdmin
            .from("message_templates")
            .delete()
            .eq("kind", data.kind)
            .eq("supply", SHARED_SUPPLY)
            .eq("workspace_id", workspaceId);

          if (deleteError) {
            console.error("saveMessageTemplate reset-delete failed", deleteError);
            return { template: null, error: "Unable to save template." };
          }

          return {
            template: templateRecordFromKind(data.kind, defaultBody, null, data.language),
            error: null,
          };
        }

        const updatedAt = new Date().toISOString();
        const payload = {
          supply: SHARED_SUPPLY,
          kind: data.kind,
          name: base.name,
          description: base.description,
          content: data.content,
          updated_at: updatedAt,
          workspace_id: workspaceId,
        };

        // Upsert workspace override by (workspace_id, supply, kind).
        const existing = await supabaseAdmin
          .from("message_templates")
          .select("id")
          .eq("kind", data.kind)
          .eq("supply", SHARED_SUPPLY)
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        let row: { kind: string; content: string; updated_at: string | null } | null = null;
        if (existing.data?.id) {
          const updated = await supabaseAdmin
            .from("message_templates")
            .update({
              content: data.content,
              name: base.name,
              description: base.description,
              updated_at: updatedAt,
            })
            .eq("id", existing.data.id)
            .select("kind, content, updated_at")
            .maybeSingle();
          if (updated.error) {
            console.error("saveMessageTemplate failed", updated.error);
            return { template: null, error: "Unable to save template." };
          }
          row = updated.data;
        } else {
          const inserted = await supabaseAdmin
            .from("message_templates")
            .insert(payload)
            .select("kind, content, updated_at")
            .maybeSingle();
          if (inserted.error) {
            console.error("saveMessageTemplate failed", inserted.error);
            return { template: null, error: "Unable to save template." };
          }
          row = inserted.data;
        }

        return {
          template: templateRecordFromKind(
            data.kind,
            row?.content ?? data.content,
            row?.updated_at ?? updatedAt,
            data.language,
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
    return {
      kind: parseKind(raw["kind"]),
      language: resolveTemplateLanguage(raw["language"]),
      workspaceId: typeof raw["workspaceId"] === "string" ? raw["workspaceId"] : "",
    };
  })
  .handler(async ({ data }) => {
    return saveMessageTemplate({
      data: {
        kind: data.kind,
        language: data.language,
        workspaceId: data.workspaceId,
        content: defaultContentFor(data.kind, data.language),
      },
    });
  });
