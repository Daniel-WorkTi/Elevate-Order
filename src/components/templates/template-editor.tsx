import { MousePointer2, RotateCcw } from "lucide-react";
import { useRef } from "react";

import { TemplateLanguageSwitcher } from "@/components/templates/template-language-switcher";
import { TemplateVariableChip } from "@/components/templates/template-variable-chip";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { LanguageCode } from "@/lib/i18n/languages";
import { useI18n } from "@/lib/i18n/locale-context";
import type { MessageTemplateRecord, TemplateVariableDef } from "@/lib/templates";

export function TemplateEditor({
  template,
  draft,
  language,
  onLanguageChange,
  variables,
  errors,
  onDraftChange,
  onInsertVariable,
  onReset,
}: {
  template: MessageTemplateRecord;
  draft: string;
  language: LanguageCode;
  onLanguageChange: (code: LanguageCode) => void;
  variables: TemplateVariableDef[];
  errors: string[];
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  onDraftChange: (value: string) => void;
  onInsertVariable: (token: string, next: string, selectionStart: number, selectionEnd: number) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  const { t, locale } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const numberLocale = locale === "pt" ? "pt-PT" : "en-US";

  function insertToken(token: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${token}${draft.slice(end)}`;
    onInsertVariable(token, next, start, end);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      const cursor = start + token.length;
      node.focus();
      node.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <section
      aria-labelledby="template-editor-heading"
      className="flex h-full min-h-0 flex-col rounded-[16px] border border-border bg-card"
    >
      <div className="shrink-0 px-5 pt-5 pb-4">
        <h2 id="template-editor-heading" className="text-[18px] font-semibold tracking-tight">
          {template.name}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{template.purpose}</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-5">
        <div className="flex min-h-0 flex-1 flex-col space-y-2">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
            <Label htmlFor="template-message" className="text-[12px] font-medium text-muted-foreground">
              {t("templates.message")}
            </Label>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <TemplateLanguageSwitcher value={language} onChange={onLanguageChange} />
              <Button
                type="button"
                variant="ghost"
                className="h-8 rounded-[8px] px-2 text-[12px] text-muted-foreground shadow-none hover:text-foreground"
                onClick={onReset}
              >
                <RotateCcw className="size-3.5" strokeWidth={1.5} />
                {t("templates.reset")}
              </Button>
            </div>
          </div>

          <p className="text-[11px] leading-snug text-[#667085]">{t("templates.languageHint")}</p>

          <div className="flex min-h-[240px] flex-1 flex-col overflow-hidden rounded-[12px] border border-[#E6E8EC] bg-white focus-within:border-[#2563EB]/40 focus-within:ring-1 focus-within:ring-[#2563EB]/20">
            <Textarea
              ref={textareaRef}
              id="template-message"
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              aria-invalid={errors.length > 0}
              aria-describedby={errors.length ? "template-errors" : "template-char-count"}
              className="min-h-0 flex-1 resize-none rounded-none border-0 bg-transparent px-4 py-3 text-[14px] leading-[1.55] shadow-none focus-visible:ring-0"
            />
            <div className="flex shrink-0 items-center justify-end border-t border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2">
              <p id="template-char-count" className="text-[11px] tabular-nums text-[#667085]">
                {t("templates.characters", {
                  count: draft.length.toLocaleString(numberLocale),
                })}
              </p>
            </div>
          </div>

          {errors.length > 0 ? (
            <ul id="template-errors" className="space-y-1 text-[12px] text-red-700" role="alert">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="shrink-0 space-y-2.5">
          <p className="text-[12px] font-medium text-muted-foreground">
            {t("templates.availableVariables")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((variable) => (
              <TemplateVariableChip
                key={variable.key}
                variable={variable}
                onInsert={insertToken}
              />
            ))}
          </div>
          <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <MousePointer2 className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {t("templates.insertHint")}
          </p>
        </div>
      </div>
    </section>
  );
}
