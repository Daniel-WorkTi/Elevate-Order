import { TEMPLATE_KIND_ICON, TEMPLATE_KIND_ICON_CLASS } from "@/lib/templates/template-icons";
import type { MessageTemplateRecord } from "@/lib/templates";
import { cn } from "@/lib/utils";

export function TemplateListItem({
  template,
  active,
  onSelect,
}: {
  template: MessageTemplateRecord;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = TEMPLATE_KIND_ICON[template.kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative w-full rounded-[12px] px-3 py-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
        active
          ? "bg-[color:var(--elevate-blue-soft)]"
          : "hover:bg-[#F7F8FA]",
      )}
    >
      {active ? (
        <span
          className="absolute top-3 bottom-3 left-0 w-[3px] rounded-full bg-[color:var(--elevate-blue)]"
          aria-hidden
        />
      ) : null}

      <div className="flex items-start gap-3 pl-1">
        <span
          className={cn(
            "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[8px]",
            TEMPLATE_KIND_ICON_CLASS[template.kind],
          )}
          aria-hidden
        >
          <Icon className="size-3.5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{template.name}</p>
          <p className="mt-0.5 line-clamp-1 text-[12px] leading-snug text-muted-foreground">
            {template.description}
          </p>
        </div>
      </div>
    </button>
  );
}
