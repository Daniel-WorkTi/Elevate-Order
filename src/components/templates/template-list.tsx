import { Plus, Settings } from "lucide-react";
import { toast } from "sonner";

import { TemplateListItem } from "@/components/templates/template-list-item";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  return (
    <section
      aria-labelledby="templates-nav-heading"
      className="flex h-full min-h-0 flex-col rounded-[16px] border border-border bg-card"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3.5">
        <h2 id="templates-nav-heading" className="text-[14px] font-semibold text-foreground">
          Templates
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[color:var(--elevate-blue)] hover:text-[color:var(--elevate-blue-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
          onClick={() =>
            toast.message("New templates are not available yet.", {
              description: "Edit the default operational templates for now.",
            })
          }
        >
          <Plus className="size-3.5" strokeWidth={1.75} aria-hidden />
          New template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="flex-1 px-4 py-8 text-center">
          <p className="text-[14px] font-medium text-foreground">No templates configured.</p>
        </div>
      ) : (
        <ScrollArea className="min-h-0 flex-1 px-2">
          <ul className="space-y-1 pb-2" role="listbox" aria-label="Message templates">
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

      <div className="mt-auto shrink-0 border-t border-border px-4 py-3">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
          onClick={() =>
            toast.message("Categories are fixed for the MVP.", {
              description: "Operational template kinds cannot be renamed yet.",
            })
          }
        >
          <Settings className="size-3.5" strokeWidth={1.5} aria-hidden />
          Manage categories
        </button>
      </div>
    </section>
  );
}
