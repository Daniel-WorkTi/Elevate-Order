import { KeyRound } from "lucide-react";

import { DropiNotificationUrlField } from "@/components/connections/dropi/dropi-notification-url-field";
import type { DropiConnectionSummary } from "@/lib/integrations/dropi/dropi-types";
import { cn } from "@/lib/utils";

/** Advanced settings — webhook URL + auth (shown once). */
export function DropiWebhookConfig({ summary }: { summary: DropiConnectionSummary }) {
  return (
    <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
      <DropiNotificationUrlField webhookPath={summary.webhookPath} />

      <div className="mt-5 border-t border-[#E6E8EC] pt-5">
        <p className="text-[12px] font-medium text-[#667085]">Authentication</p>
        <div className="mt-1.5 flex items-center gap-2 rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2.5">
          <KeyRound className="size-3.5 text-[#667085]" strokeWidth={1.75} />
          <span
            className={cn(
              "text-[13px] font-medium",
              summary.authConfigured ? "text-[#0A0C10]" : "text-[#667085]",
            )}
          >
            {summary.authConfigured ? "Configured" : "Not configured"}
          </span>
        </div>
        <p className="mt-2 text-[12px] text-[#667085]">
          Dropi must send the project publishable key via <code className="text-[11px]">apikey</code>{" "}
          or Bearer authorization. Secrets stay server-side.
        </p>
      </div>
    </section>
  );
}
