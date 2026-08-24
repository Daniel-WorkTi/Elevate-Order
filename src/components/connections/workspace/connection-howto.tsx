import { useT } from "@/lib/i18n/locale-context";
import { cn } from "@/lib/utils";

type HowToKey = "shopify" | "dropi" | "dropea";

const STEP_COUNT = 3;

/** Compact numbered guide — where to get credentials / how to connect. */
export function ConnectionHowTo({
  kind,
  className,
  compact = false,
}: {
  kind: HowToKey;
  className?: string;
  /** Shorter intro line for the connections list. */
  compact?: boolean;
}) {
  const t = useT();
  const prefix = `connections.how.${kind}` as const;

  return (
    <section
      className={cn(
        "rounded-[14px] border border-[#E6E8EC] bg-[#F7F8FA] px-4 py-3.5",
        className,
      )}
      aria-labelledby={`howto-${kind}-title`}
    >
      <h2
        id={`howto-${kind}-title`}
        className="text-[13px] font-semibold tracking-tight text-[#0A0C10]"
      >
        {t(`${prefix}.title`)}
      </h2>
      {compact ? (
        <p className="mt-1 text-[12px] leading-5 text-[#667085]">{t(`${prefix}.summary`)}</p>
      ) : (
        <ol className="mt-2.5 space-y-2">
          {Array.from({ length: STEP_COUNT }, (_, i) => {
            const step = i + 1;
            return (
              <li key={step} className="flex gap-2.5 text-[12px] leading-5 text-[#667085]">
                <span
                  className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold tabular-nums text-[#2563EB] ring-1 ring-[#E6E8EC]"
                  aria-hidden
                >
                  {step}
                </span>
                <span>{t(`${prefix}.s${step}`)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function ConnectionsIntro({ className }: { className?: string }) {
  const t = useT();

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-[#0A0C10]">
          {t("connections.introTitle")}
        </h2>
        <p className="mt-1 max-w-[640px] text-[13px] leading-5 text-[#667085]">
          {t("connections.introBody")}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <ConnectionHowTo kind="shopify" compact />
        <ConnectionHowTo kind="dropi" compact />
        <ConnectionHowTo kind="dropea" compact />
      </div>
    </div>
  );
}
