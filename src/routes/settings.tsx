import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ELEVATE" },
      {
        name: "description",
        content:
          "Configure your WhatsApp Business API credentials, message templates and Dropi Pro / Dropea sync.",
      },
      { property: "og:title", content: "Settings — ELEVATE" },
      {
        property: "og:description",
        content: "WhatsApp Business API keys, templates and integration sync settings.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Account and WhatsApp configuration.">
      <form
        className="grid gap-5 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          toast.success("Settings saved");
        }}
      >
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] lg:col-span-2">
          <div>
            <h2 className="text-[24px] font-bold">WhatsApp Business API</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Credentials are stored encrypted and used only to deliver your messages.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone-id">Phone number ID</Label>
              <Input id="phone-id" placeholder="109876543210987" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waba-id">Business account ID</Label>
              <Input id="waba-id" placeholder="204567891234567" className="rounded-xl" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="token">Permanent access token</Label>
              <Input id="token" type="password" placeholder="••••••••••••••••" className="rounded-xl" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="template">Default incident template</Label>
              <Textarea
                id="template"
                rows={5}
                className="rounded-xl"
                defaultValue={
                  "Hi {{customer}}! This is ELEVATE support about your order {{order_id}}. We noticed an incident with your delivery — could you confirm your address?"
                }
              />
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="rounded-xl gradient-cta border-0">
              Save configuration
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => toast.success("Test message sent")}
            >
              Send test message
            </Button>
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <div>
            <h2 className="text-[18px] font-semibold">Integrations</h2>
            <p className="mt-1 text-sm text-muted-foreground">Real-time order status sync.</p>
          </div>

          {[
            { name: "Dropi Pro", detail: "Connected · syncs every 2 min" },
            { name: "Dropea", detail: "Connected · syncs every 5 min" },
          ].map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between rounded-xl border border-border bg-secondary/60 p-4"
            >
              <div>
                <p className="font-medium">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.detail}</p>
              </div>
              <Switch defaultChecked aria-label={`Toggle ${integration.name}`} />
            </div>
          ))}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-message incidents</p>
              <p className="text-xs text-muted-foreground">Send template on new incident</p>
            </div>
            <Switch defaultChecked aria-label="Toggle auto-message" />
          </div>
        </section>
      </form>
    </AppShell>
  );
}
