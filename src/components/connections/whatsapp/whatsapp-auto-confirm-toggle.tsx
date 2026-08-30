import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import {
  getWorkspaceWhatsAppSettings,
  updateWorkspaceWhatsAppAutoConfirm,
} from "@/lib/orders/confirmation.functions";
import { useT } from "@/lib/i18n/locale-context";

export function WhatsAppAutoConfirmToggle({
  workspaceId,
  workspaceReady,
}: {
  workspaceId: string | null;
  workspaceReady: boolean;
}) {
  const t = useT();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["workspace", "whatsapp-settings", workspaceId],
    enabled: Boolean(workspaceId) && workspaceReady,
    queryFn: () => getWorkspaceWhatsAppSettings({ data: { workspaceId: workspaceId! } }),
  });

  const mutation = useMutation({
    mutationFn: (checked: boolean) =>
      updateWorkspaceWhatsAppAutoConfirm({
        data: { workspaceId: workspaceId!, whatsappAutoConfirm: checked },
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(["workspace", "whatsapp-settings", workspaceId], result);
      toast.success(
        result.whatsappAutoConfirm
          ? t("connections.whatsappAutoConfirmEnabled")
          : t("connections.whatsappAutoConfirmDisabled"),
      );
    },
    onError: () => {
      toast.error(t("connections.whatsappAutoConfirmUpdateFailed"));
    },
  });

  const checked = settingsQuery.data?.whatsappAutoConfirm ?? false;
  const disabled =
    !workspaceId || !workspaceReady || settingsQuery.isPending || mutation.isPending;

  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-[#E6E8EC] bg-white px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[#0A0C10]">
          {t("connections.whatsappAutoConfirm")}
        </p>
        <p className="mt-0.5 text-[12px] leading-snug text-[#667085]">
          {t("connections.whatsappAutoConfirmHint")}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => mutation.mutate(next)}
        aria-label={t("connections.whatsappAutoConfirm")}
      />
    </div>
  );
}
