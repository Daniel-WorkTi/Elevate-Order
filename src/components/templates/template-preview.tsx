import { Copy, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { TemplatePreviewMessage } from "@/components/templates/template-preview-message";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TemplatePreview({
  customerName,
  message,
  withTracking,
  onWithTrackingChange,
  warnings,
}: {
  customerName: string;
  message: string;
  withTracking: boolean;
  onWithTrackingChange: (value: boolean) => void;
  warnings: string[];
}) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      toast.success("Preview message copied");
    } catch {
      toast.error("Unable to copy message");
    }
  }

  return (
    <section
      aria-labelledby="template-preview-heading"
      className="flex h-full min-h-0 flex-col rounded-[16px] border border-border bg-card"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3.5">
        <h2 id="template-preview-heading" className="text-[14px] font-semibold text-foreground">
          Preview
        </h2>
        <Select
          value={withTracking ? "with" : "without"}
          onValueChange={(value) => onWithTrackingChange(value === "with")}
        >
          <SelectTrigger
            aria-label="Preview tracking fixture"
            className="h-8 w-[148px] rounded-[8px] text-[12px] shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="with">With tracking</SelectItem>
            <SelectItem value="without">Without tracking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
        <TemplatePreviewMessage
          customerName={customerName}
          message={message}
          timeLabel={timeLabel}
        />

        {warnings.length > 0 ? (
          <div
            role="status"
            className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900"
          >
            <p className="font-medium">Preview warnings</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-auto shrink-0 space-y-2 pt-1">
          <Button
            asChild
            variant="outline"
            className="h-10 w-full rounded-[10px] border-[#16A34A]/30 text-[#16A34A] shadow-none hover:bg-[#16A34A]/5 hover:text-[#15803D]"
          >
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" strokeWidth={1.5} />
              Open WhatsApp
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-[10px] shadow-none"
            onClick={() => void copyMessage()}
          >
            <Copy className="size-4" strokeWidth={1.5} />
            Copy message
          </Button>

          <div className="flex items-start gap-2 rounded-[10px] bg-[#F7F8FA] px-3 py-2.5 text-[12px] text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 size-3.5 shrink-0 text-[color:var(--elevate-blue)]"
              strokeWidth={1.5}
              aria-hidden
            />
            <p>Make sure the variables are correct before sending the message.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
