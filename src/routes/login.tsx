import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";

import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginCard } from "@/components/auth/login-card";
import { LoginLanguageSwitcher } from "@/components/auth/login-language-switcher";
import { getAuthUser } from "@/lib/auth/session.functions";
import { getOnboardingGate } from "@/lib/onboarding/onboarding.functions";
import { metaT } from "@/lib/i18n/meta";

export type LoginSearch = {
  error?: "oauth";
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    if (search["error"] === "oauth") {
      return { error: "oauth" };
    }
    return {};
  },
  head: () => ({
    meta: [
      { title: metaT("meta.loginTitle") },
      { name: "description", content: metaT("meta.appDescription") },
    ],
  }),
  beforeLoad: async () => {
    const user = await getAuthUser();
    if (!user) return;

    try {
      const gate = await getOnboardingGate();
      if (gate.needsOnboarding) {
        throw redirect({ to: "/onboarding", replace: true });
      }
    } catch (error) {
      if (isRedirect(error)) throw error;
    }

    throw redirect({ to: "/", replace: true });
  },
  component: LoginPage,
});

function LoginPage() {
  const { error } = Route.useSearch();

  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F8FA] lg:flex-row">
      <LoginLanguageSwitcher
        tone="light"
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-4 z-50 lg:hidden"
      />
      <LoginBrandPanel />

      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:w-[62%] lg:px-12 lg:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 70% 20%, rgba(37,99,235,0.06), transparent 60%)",
          }}
        />
        <div className="relative z-10 flex w-full justify-center">
          <LoginCard oauthError={error === "oauth"} />
        </div>
      </main>
    </div>
  );
}
