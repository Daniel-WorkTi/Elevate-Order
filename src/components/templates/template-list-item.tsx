import { Check } from "lucide-react";

import { TEMPLATE_KIND_ICON, TEMPLATE_KIND_ICON_CLASS } from "@/lib/templates/template-icons";
import { TEMPLATE_KIND_I18N } from "@/lib/templates/template-kind-i18n";
import type { MessageTemplateRecord } from "@/lib/templates";
import { useT } from "@/lib/i18n/locale-context";
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
  const t = useT();
  const Icon = TEMPLATE_KIND_ICON[template.kind];
  const keys = TEMPLATE_KIND_I18N[template.kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "relative w-full rounded-[12px] px-3 py-3 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40",
        active
          ? "bg-[#2563EB] text-white shadow-sm"
          : "hover:bg-[#F7F8FA] dark:hover:bg-muted",
      )}
    >
      {active ? (
        <span
          className="absolute top-3 bottom-3 left-0 w-[3px] rounded-full bg-white/80"
          aria-hidden
        />
      ) : null}

      <div className="flex items-start gap-3 pl-1">
        <span
          className={cn(
            "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[8px]",
            active ? "bg-white/15 text-white" : TEMPLATE_KIND_ICON_CLASS[template.kind],
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-[13px] font-semibold",
              active ? "text-white" : "text-foreground",
            )}
          >
            {t(keys.name)}
          </p>
          <p
            className={cn(
              "mt-0.5 line-clamp-1 text-[12px] leading-snug",
              active ? "text-white/80" : "text-muted-foreground",
            )}
          >
            {t(keys.description)}
          </p>
        </div>
        {active ? (
          <Check className="mt-1 size-4 shrink-0 text-white" strokeWidth={2} aria-hidden />
        ) : null}
      </div>
    </button>
  );
}
