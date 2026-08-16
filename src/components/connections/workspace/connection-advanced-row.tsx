import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Settings } from "lucide-react";

export function ConnectionAdvancedRow({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-[16px] border border-[#E6E8EC] bg-white px-4 py-3.5 text-left transition-colors hover:border-[#2563EB]/35 hover:bg-[#EFF6FF]/40"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-[#F2F4F7] text-[#667085]">
            <Settings className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span>
            <span className="block text-[14px] font-semibold text-[#0A0C10]">Advanced settings</span>
            <span className="mt-0.5 block text-[13px] text-[#667085]">
              Webhook URL, authentication, events, and field mapping
            </span>
          </span>
        </span>
        {open ? (
          <ChevronDown className="size-4 text-[#667085]" strokeWidth={1.75} />
        ) : (
          <ChevronRight className="size-4 text-[#667085]" strokeWidth={1.75} />
        )}
      </button>
      {open ? children : null}
    </div>
  );
}
