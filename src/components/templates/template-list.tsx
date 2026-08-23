import { TemplateListItem } from "@/components/templates/template-list-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageTemplateRecord } from "@/lib/templates";

export function TemplateList({
  templates,
  selectedId,
  onSelect,
}: {
  templates: MessageTemplateRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const t = useT();

  return (
    <section
      aria-labelledby="templates-nav-heading"
      className="flex h-full min-h-0 flex-col rounded-[16px] border border-border bg-card"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3.5">
        <h2 id="templates-nav-heading" className="text-[14px] font-semibold text-foreground">
          {t("templates.listHeading")}
        </h2>
      </div>

      {templates.length === 0 ? (
        <div className="flex-1 px-4 py-8 text-center">
          <p className="text-[14px] font-medium text-foreground">{t("templates.noTemplates")}</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1 px-2">
          <ul className="space-y-1 pb-2" role="listbox" aria-label={t("templates.listAria")}>
            {templates.map((template) => (
              <li key={template.id} role="option" aria-selected={template.id === selectedId}>
                <TemplateListItem
                  template={template}
                  active={template.id === selectedId}
                  onSelect={() => onSelect(template.id)}
                />
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </section>
  );
}
