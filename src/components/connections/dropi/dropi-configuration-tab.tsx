import type { DropiConnectionSummary } from "@/lib/integrations/dropi/dropi-types";

/** Advanced — events + validation only (webhook URL lives in DropiWebhookConfig). */
export function DropiConfigurationTab({ summary }: { summary: DropiConnectionSummary }) {
  return (
    <div className="space-y-5">
      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">Supported events</h2>
        <p className="mt-1 text-[13px] text-[#667085]">
          Dropi exposes one notification channel: order update notifications (POST). One webhook URL
          is enough — there is no separate named event catalog.
        </p>
        <ul className="mt-4 space-y-2 text-[13px] text-[#0A0C10]">
          <li className="rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2">
            Single order status event (object)
          </li>
          <li className="rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-3 py-2">
            Batch of order status events (array, max 500)
          </li>
        </ul>
        <p className="mt-3 text-[12px] text-[#667085]">
          Duplicate events with the same{" "}
          <code className="text-[11px]">order_id + event_date + status_id</code> are ignored. Static
          order fields (customer, phone, city, product…) are preserved when a later event only sends
          status or tracking.
        </p>
      </section>

      <section className="rounded-[16px] border border-[#E6E8EC] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[#0A0C10]">Connection validation</h2>
        <p className="mt-1 text-[13px] text-[#667085]">
          There is no synthetic health ping. Validation comes from real webhook deliveries stored in
          ELEVATE.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-[13px]">
          <div className="rounded-[10px] border border-[#E6E8EC] px-3 py-2.5">
            <dt className="text-[#667085]">Webhook auth</dt>
            <dd className="mt-0.5 font-medium text-[#0A0C10]">
              {summary.authConfigured ? "Ready" : "Missing"}
            </dd>
          </div>
          <div className="rounded-[10px] border border-[#E6E8EC] px-3 py-2.5">
            <dt className="text-[#667085]">Server</dt>
            <dd className="mt-0.5 font-medium text-[#0A0C10]">
              {summary.serverConfigured ? "Ready" : "Missing"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
