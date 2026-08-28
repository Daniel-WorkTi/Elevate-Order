import { WhatsAppInboxPanel } from "@/components/inbox/whatsapp-inbox-panel";
import { useT } from "@/lib/i18n/locale-context";

export function InboxPageContent() {
  const t = useT();

  return (
    <div className="space-y-5">
      <div className="rounded-[16px] border border-[#E6E8EC] bg-white px-4 py-4 sm:px-5">
        <h1 className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
          {t("inbox.title")}
        </h1>
        <p className="mt-0.5 text-[13px] text-[#667085]">{t("inbox.whatsapp.pageHint")}</p>
      </div>

      <WhatsAppInboxPanel />
    </div>
  );
}
