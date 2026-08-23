import { useT } from "@/lib/i18n/locale-context";
import type { TemplateVariableDef } from "@/lib/templates";

export function TemplateVariableChip({
  variable,
  onInsert,
}: {
  variable: TemplateVariableDef;
  onInsert: (token: string) => void;
}) {
  const t = useT();

  return (
    <button
      type="button"
      onClick={() => onInsert(variable.token)}
      title={t("templates.insertVariable", { token: variable.token })}
      className="inline-flex items-center rounded-full border border-border bg-[#F7F8FA] px-2.5 py-1 font-mono text-[11px] font-medium text-[#344054] transition-colors hover:border-[color:var(--elevate-blue)]/30 hover:bg-[color:var(--elevate-blue-soft)] hover:text-[color:var(--elevate-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
    >
      {variable.token}
    </button>
  );
}
