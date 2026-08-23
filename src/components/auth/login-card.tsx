import { useEffect, useState } from "react";
import { HelpCircle, ShieldCheck } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { GoogleMark, SocialLoginButton } from "@/components/auth/social-login-button";
import { startGoogleLogin } from "@/lib/auth/social-login";
import { useT } from "@/lib/i18n/locale-context";

export function LoginCard({ oauthError = false }: { oauthError?: boolean }) {
  const t = useT();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [showOauthError, setShowOauthError] = useState(oauthError);

  useEffect(() => {
    if (!oauthError) return;
    setShowOauthError(true);
    void navigate({ to: "/login", search: {}, replace: true });
  }, [oauthError, navigate]);

  async function onGoogle() {
    try {
      setPending(true);
      await startGoogleLogin();
    } catch {
      setPending(false);
      toast.error(t("login.signInFailedToast"));
    }
  }

  return (
    <div className="flex w-full max-w-[420px] flex-col items-center">
      <div className="w-full rounded-[20px] border border-[#E6E8EC] bg-white p-8 shadow-[0_1px_2px_rgba(10,12,16,0.04),0_8px_24px_rgba(10,12,16,0.04)] sm:p-10">
        <header className="text-center">
          <h2 className="text-[24px] font-semibold tracking-tight text-[#0A0C10]">
            {t("login.welcome")}
          </h2>
          <p className="mt-2 text-[14px] text-[#667085]">{t("login.subtitle")}</p>
        </header>

        {showOauthError ? (
          <div
            role="alert"
            className="mt-6 rounded-[12px] border border-red-200 bg-red-50 px-3.5 py-3 text-left"
          >
            <p className="text-[13px] font-semibold text-red-700">{t("login.signInFailed")}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-red-700/80">
              {t("login.signInFailedDetail")}
            </p>
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          <SocialLoginButton
            label={t("login.continueGoogle")}
            pendingLabel={t("login.connecting")}
            icon={<GoogleMark className="size-5" />}
            onClick={() => void onGoogle()}
            pending={pending}
          />
        </div>

        <footer className="mt-8 border-t border-[#E6E8EC] pt-5">
          <p className="flex items-center justify-center gap-1.5 whitespace-nowrap text-center text-[12px] text-[#98A2B3]">
            <ShieldCheck
              className="size-3.5 shrink-0 text-[#2563EB]"
              strokeWidth={1.75}
              aria-hidden
            />
            {t("login.secureNote")}
          </p>
        </footer>
      </div>

      <a
        href="mailto:support@elevate.orders"
        className="mt-5 inline-flex items-center gap-1.5 rounded-md text-[12px] font-medium text-[#667085] transition-colors hover:text-[#0A0C10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 focus-visible:ring-offset-2"
      >
        <HelpCircle className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        {t("login.needHelp")}
      </a>
    </div>
  );
}
