import { AlertTriangle, MessageCircle, RefreshCw } from "lucide-react";

import { LoginLanguageSwitcher } from "@/components/auth/login-language-switcher";
import markUrl from "@/assets/elevate-mark.png";
import { useT } from "@/lib/i18n/locale-context";

const FEATURES = [
  {
    icon: AlertTriangle,
    titleKey: "login.feature.incidents.title",
    descKey: "login.feature.incidents.desc",
  },
  {
    icon: MessageCircle,
    titleKey: "login.feature.contact.title",
    descKey: "login.feature.contact.desc",
  },
  {
    icon: RefreshCw,
    titleKey: "login.feature.sync.title",
    descKey: "login.feature.sync.desc",
  },
] as const;

export function LoginBrandPanel() {
  const t = useT();

  return (
    <aside className="relative flex min-h-[320px] flex-col overflow-hidden bg-[#0A0C10] px-8 py-10 text-white lg:min-h-dvh lg:w-[38%] lg:px-12 lg:py-12 xl:px-14">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(37,99,235,0.28), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, rgba(37,99,235,0.12), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 size-[420px] rounded-full opacity-40 blur-3xl"
        aria-hidden
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.35), transparent 70%)",
        }}
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 pr-[6.75rem] lg:pr-0">
          <span className="grid size-10 place-items-center overflow-hidden rounded-[10px] bg-white">
            <img
              src={markUrl}
              alt=""
              width={40}
              height={40}
              className="size-10 object-contain"
              decoding="async"
            />
          </span>
          <div className="leading-none">
            <p className="text-[15px] font-semibold tracking-tight">ELEVATE</p>
            <p className="mt-1 text-[12px] text-[#98A2B3]">{t("shell.productSubtitle")}</p>
          </div>
        </div>
        <LoginLanguageSwitcher className="hidden lg:inline-flex" />
      </div>

      <div className="relative z-10 mt-12 max-w-md lg:mt-20">
        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[44px] lg:text-[48px]">
          {t("login.brandHeadlineLead")}
          <br />
          <span className="text-[#2563EB]">{t("login.brandHeadlineAccent")}</span>
        </h1>
        <p className="mt-5 text-[15px] leading-relaxed text-[#98A2B3]">{t("login.brandBody")}</p>
      </div>

      <ul className="relative z-10 mt-10 space-y-4 lg:mt-14">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <li key={feature.titleKey} className="flex items-start gap-3.5">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#2563EB]/25 bg-[#2563EB]/10 text-[#60A5FA] shadow-[0_0_20px_rgba(37,99,235,0.15)]">
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[14px] font-semibold text-white">{t(feature.titleKey)}</p>
                <p className="mt-0.5 text-[13px] text-[#667085]">{t(feature.descKey)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40" aria-hidden>
        <svg
          viewBox="0 0 600 160"
          fill="none"
          className="h-full w-full opacity-70"
          preserveAspectRatio="none"
        >
          <path
            d="M0 120 C 120 40, 220 140, 320 90 C 420 40, 500 110, 600 70"
            stroke="url(#elevateFlow)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M0 140 C 140 70, 240 150, 360 100 C 460 60, 520 130, 600 95"
            stroke="url(#elevateFlow)"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
          <defs>
            <linearGradient id="elevateFlow" x1="0" y1="0" x2="600" y2="0">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
              <stop offset="40%" stopColor="#2563EB" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </aside>
  );
}
