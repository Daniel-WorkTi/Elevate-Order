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
      { title: "Templates — ELEVATE" },
      {
        name: "description",
        content: "Control the messages used for each order situation.",
      },
    ],
  }),
  component: TemplatesPage,
});

type MobilePane = "templates" | "edit" | "preview";

function TemplatesPage() {
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
      const stillThere = list.some((t) => t.id === current);
      if (stillThere && current) return current;
      const first = list[0] ?? null;
      if (first) setDraft(first.content);
      return first?.id ?? null;
    });
  }, [query.data]);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const dirty = Boolean(selected && draft !== selected.content);
  const validation = validateTemplateContent(draft);
  const variables = templateVariables();

  const previewContext = createPreviewContext({ withTracking });
  const rendered = renderOrderTemplate({ template: draft, context: previewContext });
  const previewWarnings = [
    ...validation.unsupported.map((key) => `Unsupported variable: {{${key}}}`),
    ...rendered.unsupported
      .filter((key) => !validation.unsupported.includes(key))
      .map((key) => `Unsupported variable: {{${key}}}`),
  ];

  const loadError = query.data?.error ?? (query.isError ? "Unable to load templates." : null);
  const showSkeleton = query.isPending && templates.length === 0;
  const hasTemplates = templates.length > 0;

  function selectTemplate(id: string) {
    if (dirty && id !== selectedId) {
      setPendingTemplateId(id);
      return;
    }
    const next = templates.find((t) => t.id === id);
    if (!next) return;
    setSelectedId(next.id);
    setDraft(next.content);
    setMobilePane("edit");
  }

  function discardAndContinue() {
    if (!pendingTemplateId) return;
    const id = pendingTemplateId;
    setPendingTemplateId(null);
    const next = templates.find((t) => t.id === id);
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
        toast.error(result.error ?? "Unable to save template.");
        return;
      }
      setTemplates((prev) => prev.map((t) => (t.id === result.template!.id ? result.template! : t)));
      setDraft(result.template.content);
      toast.success("Template saved");
      void query.refetch();
    } catch {
      toast.error("Unable to save template.");
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
        toast.error(result.error ?? "Unable to reset template.");
        return;
      }
      setTemplates((prev) => prev.map((t) => (t.id === result.template!.id ? result.template! : t)));
      setDraft(defaultContentFor(selected.kind));
      toast.success("Template reset to default");
      void query.refetch();
    } catch {
      toast.error("Unable to reset template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Templates" subtitle="Control the messages used for each order situation.">
      <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col gap-4">
        <div className="shrink-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Templates</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                One set of messages for every order — Dropi and Dropea included.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {dirty ? (
                <span className="text-[12px] font-medium text-muted-foreground">Unsaved changes</span>
              ) : null}
              <Button
                type="button"
                className="h-9 rounded-[10px] bg-[color:var(--elevate-blue)] px-4 text-[13px] shadow-none hover:bg-[color:var(--elevate-blue-hover)]"
                disabled={!dirty || !validation.ok || saving}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Templates workspace"
          className="grid shrink-0 grid-cols-3 gap-1 rounded-[10px] border border-border bg-card p-0.5 md:hidden"
        >
          {(
            [
              { id: "templates", label: "Templates" },
              { id: "edit", label: "Edit" },
              { id: "preview", label: "Preview" },
            ] as const
          ).map((tab) => (
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
            <p className="text-[15px] font-medium text-foreground">Unable to load templates.</p>
            <p className="mt-1 text-[13px] text-muted-foreground">{loadError}</p>
            <Button
              type="button"
              className="mt-5 h-9 rounded-[10px] text-[13px] shadow-none"
              onClick={() => void query.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {!showSkeleton && loadError && hasTemplates ? (
          <div
            role="status"
            className="shrink-0 rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-950"
          >
            <p className="font-medium">Templates loaded with a warning</p>
            <p className="mt-1 text-amber-900/90">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-8 rounded-[10px] text-[12px] shadow-none"
              onClick={() => void query.refetch()}
            >
              Retry
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
                  errors={validation.errors}
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
                  <p className="text-[14px] font-medium">No templates configured.</p>
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
                customerName={previewContext.customerName ?? "Customer"}
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
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved edits on this template. Leaving will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[10px]">Keep editing</AlertDialogCancel>
            <AlertDialogAction className="rounded-[10px]" onClick={discardAndContinue}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
