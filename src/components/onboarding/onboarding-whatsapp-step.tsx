import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";

import { OnboardingNav } from "@/components/onboarding/onboarding-nav";
import { OnboardingStepper } from "@/components/onboarding/onboarding-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useWhatsAppSettings,
  type WhatsAppSettings,
} from "@/hooks/use-whatsapp-settings";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type OnboardingWhatsappStepProps = {
  onBack: () => void;
  onContinue: () => void;
};

function isLinked(settings: WhatsAppSettings) {
  return Boolean(settings.phoneNumberId.trim() && settings.permanentToken.trim());
}

export function OnboardingWhatsappStep({ onBack, onContinue }: OnboardingWhatsappStepProps) {
  const t = useT();
  const { settings, save } = useWhatsAppSettings();
  const [draft, setDraft] = useState<WhatsAppSettings>(settings);
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const linked = isLinked(settings) || justSaved;

  function update<K extends keyof WhatsAppSettings>(key: K, value: WhatsAppSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  }

  function connect() {
    const phoneNumberId = draft.phoneNumberId.trim();
    const permanentToken = draft.permanentToken.trim();
    if (!phoneNumberId || !permanentToken) {
      setError(t("onboarding.whatsapp.errorRequired"));
      return;
    }
    save({
      ...draft,
      phoneNumberId,
      businessAccountId: draft.businessAccountId.trim(),
      permanentToken,
      autoMessage: draft.autoMessage,
      defaultIncidentTemplate:
        draft.defaultIncidentTemplate.trim() || t("settings.defaultTemplateValue"),
    });
    setJustSaved(true);
  }

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <OnboardingStepper currentStep="whatsapp" className="mb-10 md:mb-12" />

      <header className="text-center">
        <h2 className="text-[28px] font-semibold tracking-tight text-foreground md:text-[32px]">
          {t("onboarding.whatsapp.headline")}
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground md:text-[16px]">
          {t("onboarding.whatsapp.body")}
        </p>
      </header>

      {linked ? (
        <div className="mt-8 flex items-start gap-3 rounded-[14px] border border-[#A6F4C5] bg-[#ECFDF3] px-4 py-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#027A48]" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#027A48]">
              {t("onboarding.whatsapp.connectedTitle")}
            </p>
            <p className="mt-1 text-[13px] text-[#027A48]/80">
              {t("onboarding.whatsapp.connectedBody")}
            </p>
          </div>
        </div>
      ) : null}

      <form
        className="mt-8 space-y-4 rounded-[16px] border border-border bg-card p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          connect();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="ob-wa-phone">{t("settings.phoneNumberId")}</Label>
          <Input
            id="ob-wa-phone"
            value={draft.phoneNumberId}
            onChange={(event) => update("phoneNumberId", event.target.value)}
            placeholder="109876543210987"
            className="h-10 rounded-[10px]"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-wa-waba">{t("settings.businessAccountId")}</Label>
          <Input
            id="ob-wa-waba"
            value={draft.businessAccountId}
            onChange={(event) => update("businessAccountId", event.target.value)}
            placeholder="204567891234567"
            className="h-10 rounded-[10px]"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ob-wa-token">{t("settings.permanentToken")}</Label>
          <div className="relative">
            <Input
              id="ob-wa-token"
              type={showToken ? "text" : "password"}
              value={draft.permanentToken}
              onChange={(event) => update("permanentToken", event.target.value)}
              placeholder="••••••••••••••••"
              className="h-10 rounded-[10px] pr-10"
              autoComplete="off"
            />
            <button
              type="button"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowToken((v) => !v)}
              aria-label={showToken ? t("onboarding.whatsapp.hideToken") : t("onboarding.whatsapp.showToken")}
            >
              {showToken ? (
                <EyeOff className="size-4" strokeWidth={1.75} />
              ) : (
                <Eye className="size-4" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-[#F7F8FA] px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-foreground">
              {t("onboarding.whatsapp.confirmToggle")}
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {t("onboarding.whatsapp.confirmToggleHint")}
            </p>
          </div>
          <Switch
            checked={draft.autoMessage}
            onCheckedChange={(checked) => update("autoMessage", checked)}
            aria-label={t("onboarding.whatsapp.confirmToggle")}
          />
        </div>

        {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

        <Button
          type="submit"
          className={cn(
            "h-10 w-full rounded-[10px] text-[14px] font-medium text-white shadow-none",
            "bg-[#25D366] hover:bg-[#1EBE57]",
          )}
        >
          {linked ? t("onboarding.whatsapp.update") : t("onboarding.whatsapp.connect")}
        </Button>
      </form>

      <OnboardingNav
        onBack={onBack}
        {...(linked ? { onContinue } : {})}
        backLabel={t("onboarding.back")}
        continueLabel={t("onboarding.continue")}
      />

      {!linked ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onContinue}
            className="text-[14px] text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--elevate-blue)]/40"
          >
            {t("onboarding.whatsapp.skip")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
