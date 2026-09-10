import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useDropeaConnectionPreference } from "@/hooks/use-dropea-connection-preference";
import { useWhatsAppSettings, type WhatsAppUiPreferences } from "@/hooks/use-whatsapp-settings";
import { applyOperatorDropiSummary } from "@/lib/integrations/dropi/dropi-operator-status";
import { getDropiDashboard } from "@/lib/integrations/dropi/dropi.functions";
import { useT } from "@/lib/i18n/locale-context";
import { metaT } from "@/lib/i18n/meta";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: metaT("meta.settingsTitle") },
      { name: "description", content: metaT("meta.appDescription") },
      { property: "og:title", content: metaT("meta.settingsTitle") },
      { property: "og:description", content: metaT("meta.appDescription") },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const t = useT();
  const { settings, save } = useWhatsAppSettings();
  const { workspaceId } = useWorkspaceId();
  const dropea = useDropeaConnectionPreference(workspaceId);
  const dropiQuery = useQuery({
    queryKey: ["connections", "dropi", "dashboard", workspaceId, "settings"],
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const dashboard = await getDropiDashboard({ data: { workspaceId } });
      return applyOperatorDropiSummary(dashboard.summary);
    },
  });
  const dropiLinked =
    dropiQuery.data?.status === "connected" || dropiQuery.data?.status === "configured";
  const [draft, setDraft] = useState<WhatsAppUiPreferences>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function update<K extends keyof WhatsAppUiPreferences>(key: K, value: WhatsAppUiPreferences[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <AppShell title={t("settings.title")} subtitle={t("settings.subtitle")}>
      <form
        className="grid gap-5 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          save({
            ...draft,
            defaultIncidentTemplate:
              draft.defaultIncidentTemplate.trim() || t("settings.defaultTemplateValue"),
          });
          toast.success(t("settings.saved"));
        }}
      >
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] lg:col-span-2">
          <div>
            <h2 className="text-[24px] font-bold">{t("settings.whatsappApi")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("settings.whatsappApiHint")}</p>
          </div>

          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <p className="text-sm text-muted-foreground">{t("settings.whatsappManagedHint")}</p>
            <Button asChild variant="outline" size="sm" className="mt-3 rounded-[10px] shadow-none">
              <Link to="/connections/whatsapp">{t("settings.manageWhatsAppConnection")}</Link>
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template">{t("settings.defaultIncidentTemplate")}</Label>
            <Textarea
              id="template"
              rows={5}
              className="rounded-xl"
              value={draft.defaultIncidentTemplate || t("settings.defaultTemplateValue")}
              onChange={(event) => update("defaultIncidentTemplate", event.target.value)}
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="rounded-xl gradient-cta border-0">
              {t("settings.saveConfiguration")}
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link to="/connections/whatsapp">{t("settings.manageWhatsAppConnection")}</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div>
            <h2 className="text-[18px] font-semibold">{t("settings.integrations")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("settings.integrationsHint")}</p>
          </div>

          {[
            { name: "Dropi", linked: dropiLinked, to: "/connections/dropi" as const },
            {
              name: "Dropea",
              linked: dropea.linked,
              to: "/connections/dropea" as const,
            },
          ].map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/60 p-4"
            >
              <div>
                <p className="font-medium">{integration.name}</p>
                <p className="text-xs text-muted-foreground">
                  {integration.linked ? t("connections.connected") : t("connections.notConnected")}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-[10px] shadow-none">
                <Link to={integration.to}>{t("settings.manageConnection")}</Link>
              </Button>
            </div>
          ))}

          <Button asChild variant="outline" className="w-full rounded-[10px] shadow-none">
            <Link to="/connections">{t("settings.openConnections")}</Link>
          </Button>

          <Separator />

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{t("settings.autoMessage")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.autoMessageHint")}</p>
            </div>
            <Switch
              checked={draft.autoMessage}
              onCheckedChange={(checked) => update("autoMessage", checked)}
              aria-label={t("settings.toggleAutoMessage")}
            />
          </div>
        </section>
      </form>
    </AppShell>
  );
}
