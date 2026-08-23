import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { TemplateEditor } from "@/components/templates/template-editor";
import { TemplateList } from "@/components/templates/template-list";
import { TemplatePreview } from "@/components/templates/template-preview";
import { TemplatesSkeleton } from "@/components/templates/templates-skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";
import {
  listMessageTemplates,
  resetMessageTemplate,
  saveMessageTemplate,
} from "@/lib/templates.functions";
import {
  createPreviewContext,
  defaultContentFor,
  renderOrderTemplate,
  templateVariables,
  validateTemplateContent,
  type MessageTemplateRecord,
} from "@/lib/templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: metaT("meta.templatesTitle") },
      { name: "description", content: metaT("meta.templatesDescription") },
    ],
  }),
  component: TemplatesPage,
});

type MobilePane = "templates" | "edit" | "preview";

function translateValidationErrors(
  t: (key: string, params?: Record<string, string | number | null | undefined>) => string,
  errors: string[],
): string[] {
  return errors.map((error) => {
    if (error === "Message cannot be empty.") return t("templates.errors.empty");
    if (error.startsWith("Unknown variable:")) {
      const match = error.match(/\{\{(.+?)\}\}/);
      return t("templates.errors.unknownVariable", {
        token: match ? `{{${match[1]}}}` : error,
      });
    }
    if (error.includes("Malformed placeholder")) {
      return t("templates.errors.malformed");
    }
    return error;
  });
}

function TemplatesPage() {
  const t = useT();
  const query = useQuery({
    queryKey: ["message-templates"],
    queryFn: () => listMessageTemplates(),
    placeholderData: keepPreviousData,
  });

  const [templates, setTemplates] = useState<MessageTemplateRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [withTracking, setWithTracking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mobilePane, setMobilePane] = useState<MobilePane>("templates");
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data?.templates) return;
    const list = query.data.templates;
    setTemplates(list);
    setSelectedId((current) => {
      const stillThere = list.some((item) => item.id === current);
      if (stillThere && current) return current;
      const first = list[0] ?? null;
      if (first) setDraft(first.content);
      return first?.id ?? null;
    });
  }, [query.data]);

  const selected = useMemo(
    () => templates.find((item) => item.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const dirty = Boolean(selected && draft !== selected.content);
  const validation = validateTemplateContent(draft);
  const variables = templateVariables();
  const editorErrors = translateValidationErrors(t, validation.errors);

  const previewContext = createPreviewContext({ withTracking });
  const rendered = renderOrderTemplate({ template: draft, context: previewContext });
  const unsupportedKeys = [
    ...validation.unsupported,
    ...rendered.unsupported.filter((key) => !validation.unsupported.includes(key)),
  ];
  const previewWarnings = unsupportedKeys.map((key) =>
    t("templates.warnings.unsupportedVariable", { token: `{{${key}}}` }),
  );

  const loadError = query.data?.error ?? (query.isError ? t("templates.loadError") : null);
  const showSkeleton = query.isPending && templates.length === 0;
  const hasTemplates = templates.length > 0;

  function selectTemplate(id: string) {
    if (dirty && id !== selectedId) {
      setPendingTemplateId(id);
      return;
    }
    const next = templates.find((item) => item.id === id);
    if (!next) return;
    setSelectedId(next.id);
    setDraft(next.content);
    setMobilePane("edit");
  }

  function discardAndContinue() {
    if (!pendingTemplateId) return;
    const id = pendingTemplateId;
    setPendingTemplateId(null);
    const next = templates.find((item) => item.id === id);
    if (!next) return;
    setSelectedId(next.id);
    setDraft(next.content);
    setMobilePane("edit");
  }

  async function handleSave() {
    if (!selected || !validation.ok || !dirty) return;
    setSaving(true);
    try {
      const result = await saveMessageTemplate({
        data: {
          kind: selected.kind,
          content: draft,
        },
      });
      if (result.error || !result.template) {
        toast.error(result.error ?? t("templates.saveError"));
        return;
      }
      setTemplates((prev) =>
        prev.map((item) => (item.id === result.template!.id ? result.template! : item)),
      );
      setDraft(result.template.content);
      toast.success(t("templates.saved"));
      void query.refetch();
    } catch {
      toast.error(t("templates.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await resetMessageTemplate({
        data: { kind: selected.kind },
      });
      if (result.error || !result.template) {
        toast.error(result.error ?? t("templates.resetError"));
        return;
      }
      setTemplates((prev) =>
        prev.map((item) => (item.id === result.template!.id ? result.template! : item)),
      );
      setDraft(defaultContentFor(selected.kind));
      toast.success(t("templates.resetSuccess"));
      void query.refetch();
    } catch {
      toast.error(t("templates.resetError"));
    } finally {
      setSaving(false);
    }
  }

  const mobileTabs = [
    { id: "templates" as const, label: t("templates.tab.list") },
    { id: "edit" as const, label: t("templates.tab.edit") },
    { id: "preview" as const, label: t("templates.tab.preview") },
  ];

  return (
    <AppShell title={t("templates.title")} subtitle={t("templates.subtitle")}>
      <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-4">
        <div className="shrink-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
                {t("templates.title")}
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">{t("templates.pageHint")}</p>
            </div>
            <div className="flex items-center gap-3">
              {dirty ? (
                <span className="text-[12px] font-medium text-muted-foreground">
                  {t("templates.unsavedChanges")}
                </span>
              ) : null}
              <Button
                type="button"
                className="h-9 rounded-[10px] bg-[color:var(--elevate-blue)] px-4 text-[13px] shadow-none hover:bg-[color:var(--elevate-blue-hover)]"
                disabled={!dirty || !validation.ok || saving}
                onClick={() => void handleSave()}
              >
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </div>
        </div>

        <div
          role="tablist"
          aria-label={t("templates.workspaceAria")}
          className="grid shrink-0 grid-cols-3 gap-1 rounded-[10px] border border-border bg-card p-0.5 md:hidden"
        >
          {mobileTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={mobilePane === tab.id}
              onClick={() => setMobilePane(tab.id)}
              className={cn(
                "h-9 rounded-[8px] text-[13px] font-medium",
                mobilePane === tab.id
                  ? "bg-[color:var(--elevate-blue-soft)] text-[color:var(--elevate-blue)]"
                  : "text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showSkeleton ? <TemplatesSkeleton /> : null}

        {!showSkeleton && loadError && !hasTemplates ? (
          <div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
            <p className="text-[15px] font-medium text-foreground">{t("templates.loadError")}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{loadError}</p>
            <Button
              type="button"
              className="mt-5 h-9 rounded-[10px] text-[13px] shadow-none"
              onClick={() => void query.refetch()}
            >
              {t("common.retry")}
            </Button>
          </div>
        ) : null}

        {!showSkeleton && loadError && hasTemplates ? (
          <div
            role="status"
            className="shrink-0 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950"
          >
            <p className="font-medium">{t("templates.loadWarning")}</p>
            <p className="mt-1 text-amber-900/90">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-8 rounded-[10px] text-[12px] shadow-none"
              onClick={() => void query.refetch()}
            >
              {t("common.retry")}
            </Button>
          </div>
        ) : null}

        {!showSkeleton && hasTemplates ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-5 md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[270px_minmax(0,1fr)_340px]">
            <aside
              className={cn(
                "min-h-[70dvh]",
                "md:sticky md:top-0 md:h-[calc(100dvh-8.5rem)] md:min-h-0 md:self-start",
                mobilePane === "templates" ? "block" : "hidden md:block",
              )}
            >
              <TemplateList
                templates={templates}
                selectedId={selectedId}
                onSelect={selectTemplate}
              />
            </aside>

            <div
              className={cn(
                "min-h-[70dvh] md:h-[calc(100dvh-8.5rem)] md:min-h-0",
                mobilePane === "edit" ? "block" : "hidden md:block",
              )}
            >
              {selected ? (
                <TemplateEditor
                  template={selected}
                  draft={draft}
                  variables={variables}
                  errors={editorErrors}
                  dirty={dirty}
                  canSave={dirty && validation.ok}
                  saving={saving}
                  onDraftChange={setDraft}
                  onInsertVariable={(_token, next) => setDraft(next)}
                  onReset={() => void handleReset()}
                  onSave={() => void handleSave()}
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-[16px] border border-border bg-card px-6 py-16 text-center">
                  <p className="text-[14px] font-medium">{t("templates.noTemplates")}</p>
                </div>
              )}
            </div>

            <aside
              className={cn(
                "min-h-[70dvh] md:col-span-2 lg:col-span-1",
                "md:sticky md:top-0 md:h-[calc(100dvh-8.5rem)] md:min-h-0 md:self-start",
                mobilePane === "preview" ? "block" : "hidden md:block",
              )}
            >
              <TemplatePreview
                customerName={previewContext.customerName ?? t("templates.customerFallback")}
                message={rendered.text}
                withTracking={withTracking}
                onWithTrackingChange={setWithTracking}
                warnings={previewWarnings}
              />
            </aside>
          </div>
        ) : null}
      </div>

      <AlertDialog
        open={Boolean(pendingTemplateId)}
        onOpenChange={(open) => {
          if (!open) setPendingTemplateId(null);
        }}
      >
        <AlertDialogContent className="rounded-[16px]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("templates.discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("templates.discardDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[10px]">
              {t("templates.keepEditing")}
            </AlertDialogCancel>
            <AlertDialogAction className="rounded-[10px]" onClick={discardAndContinue}>
              {t("common.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
