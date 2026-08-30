import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  formatConfirmationKeywordInput,
} from "@/lib/whatsapp/inbound/classify-confirmation-intent";
import {
  getWorkspaceWhatsAppSettings,
  updateWorkspaceWhatsAppConfirmationKeywords,
} from "@/lib/orders/confirmation.functions";
import { useT } from "@/lib/i18n/locale-context";

export function WhatsAppConfirmationKeywords({
  workspaceId,
  workspaceReady,
}: {
  workspaceId: string | null;
  workspaceReady: boolean;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [rejectText, setRejectText] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["workspace", "whatsapp-settings", workspaceId],
    enabled: Boolean(workspaceId) && workspaceReady,
    queryFn: () => getWorkspaceWhatsAppSettings({ data: { workspaceId: workspaceId! } }),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setConfirmText(formatConfirmationKeywordInput(settingsQuery.data.confirmKeywords));
    setRejectText(formatConfirmationKeywordInput(settingsQuery.data.rejectKeywords));
  }, [settingsQuery.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateWorkspaceWhatsAppConfirmationKeywords({
        data: {
          workspaceId: workspaceId!,
          confirmKeywordsText: confirmText,
          rejectKeywordsText: rejectText,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspace", "whatsapp-settings", workspaceId] });
      toast.success(t("connections.whatsappKeywordsSaved"));
    },
    onError: () => {
      toast.error(t("connections.whatsappKeywordsSaveFailed"));
    },
  });

  const disabled = !workspaceId || !workspaceReady || settingsQuery.isPending || mutation.isPending;
  const defaults = settingsQuery.data;

  return (
    <div className="space-y-4 rounded-[14px] border border-[#E6E8EC] bg-white p-4">
      <div>
        <p className="text-[14px] font-medium text-[#0A0C10]">
          {t("connections.whatsappKeywordsTitle")}
        </p>
        <p className="mt-1 text-[12px] leading-snug text-[#667085]">
          {t("connections.whatsappKeywordsHint")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[12px] font-medium text-[#0A0C10]">
            {t("connections.whatsappKeywordsConfirm")}
          </label>
          <Textarea
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={disabled}
            rows={5}
            placeholder={t("connections.whatsappKeywordsPlaceholder")}
            className="min-h-[120px] resize-y rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          />
          {defaults ? (
            <p className="text-[11px] leading-snug text-[#98A2B3]">
              {t("connections.whatsappKeywordsBuiltIn")}: {defaults.defaultConfirmKeywords.join(", ")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-[12px] font-medium text-[#0A0C10]">
            {t("connections.whatsappKeywordsReject")}
          </label>
          <Textarea
            value={rejectText}
            onChange={(e) => setRejectText(e.target.value)}
            disabled={disabled}
            rows={5}
            placeholder={t("connections.whatsappKeywordsPlaceholder")}
            className="min-h-[120px] resize-y rounded-[10px] border-[#E6E8EC] text-[13px] shadow-none"
          />
          {defaults ? (
            <p className="text-[11px] leading-snug text-[#98A2B3]">
              {t("connections.whatsappKeywordsBuiltIn")}: {defaults.defaultRejectKeywords.join(", ")}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={disabled}
          onClick={() => mutation.mutate()}
          className="h-9 rounded-[10px] bg-[#2563EB] px-4 text-[13px] font-medium text-white hover:bg-[#1D4ED8]"
        >
          {t("connections.whatsappKeywordsSave")}
        </Button>
      </div>
    </div>
  );
}
