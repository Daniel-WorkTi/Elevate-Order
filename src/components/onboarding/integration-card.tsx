import { ConnectSpinButton } from "@/components/onboarding/connect-spin-button";
import type { IntegrationOption } from "@/components/onboarding/types";
import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type IntegrationCardProps = {
  integration: IntegrationOption;
  selected?: boolean;
  className?: string;
  onSelect?: (id: IntegrationOption["id"]) => void;
};

export function IntegrationCard({
  integration,
  selected = false,
  className,
  onSelect,
}: IntegrationCardProps) {
  const t = useT();
  const { Icon } = integration;

  return (
    <article
      className={cn(
        "flex h-full min-h-[280px] flex-col rounded-[16px] border bg-card p-6 transition-[border-color,box-shadow] duration-200",
        selected
          ? "border-[color:var(--elevate-blue)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--elevate-blue)_25%,transparent),0_1px_2px_rgb(10_12_16/0.06)]"
          : "border-border hover:border-[color:var(--elevate-blue)]/35 hover:shadow-[0_1px_2px_rgb(10_12_16/0.06)]",
        className,
      )}
    >
      <div
        className={cn(
          "grid size-12 place-items-center overflow-hidden rounded-[12px]",
          integration.accentClass,
        )}
      >
        <Icon
          className={
            integration.id === "dropea" ? "size-full object-cover" : "size-9 object-contain"
          }
        />
      </div>

      <h3 className="mt-5 text-[18px] font-semibold tracking-tight text-foreground">
        {integration.name}
      </h3>
      <p className="mt-2 flex-1 text-[14px] leading-relaxed text-muted-foreground">
        {t(`onboarding.integration.${integration.id}`)}
      </p>
      <p className="mt-2 text-[12px] text-muted-foreground">{t("onboarding.store.connectLaterHint")}</p>

      <ConnectSpinButton
        className="mt-6"
        label={selected ? t("onboarding.selected") : t("onboarding.continueWith", { name: integration.name })}
        ariaLabel={t("onboarding.continueWithAria", { name: integration.name })}
        onClick={() => onSelect?.(integration.id)}
      />
    </article>
  );
}
