import { Phone, Video } from "lucide-react";

export function TemplatePreviewMessage({
  customerName,
  message,
  timeLabel,
}: {
  customerName: string;
  message: string;
  timeLabel: string;
}) {
  const initials = customerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className="overflow-hidden rounded-[16px] border border-border bg-white"
      aria-label="WhatsApp-style message preview"
    >
      <div className="flex items-center gap-2.5 border-b border-border bg-[#F7F8FA] px-3 py-2.5">
        <div
          className="flex size-8 items-center justify-center rounded-full bg-[color:var(--elevate-blue-soft)] text-[11px] font-semibold text-[color:var(--elevate-blue)]"
          aria-hidden
        >
          {initials || "C"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-foreground">{customerName}</p>
          <p className="text-[11px] text-emerald-600">Online</p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground" aria-hidden>
          <Video className="size-3.5" strokeWidth={1.5} />
          <Phone className="size-3.5" strokeWidth={1.5} />
        </div>
      </div>

      <div className="bg-[#ECE5DD]/55 px-3 py-4">
        <div className="max-w-[95%] rounded-[12px] rounded-tl-sm bg-[#DCF8C6] px-3 py-2.5 text-[13px] leading-relaxed text-[#0A0C10]">
          <p className="whitespace-pre-wrap">{message || "—"}</p>
          <p className="mt-1.5 text-right text-[10px] text-[#667085]">{timeLabel}</p>
        </div>
      </div>
    </div>
  );
}
