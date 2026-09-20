/** Session-only skip flags — never treated as Connected. */

const SKIP_KEY = "elevate-onboarding-skipped";

export type OnboardingSkipFlags = {
  configuration: boolean;
  whatsapp: boolean;
};

const EMPTY: OnboardingSkipFlags = { configuration: false, whatsapp: false };

export function readOnboardingSkips(): OnboardingSkipFlags {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.sessionStorage.getItem(SKIP_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Legacy store/orders skips → configuration
    const configuration =
      Boolean(parsed["configuration"]) ||
      Boolean(parsed["store"]) ||
      Boolean(parsed["orders"]);
    return {
      configuration,
      whatsapp: Boolean(parsed["whatsapp"]),
    };
  } catch {
    return { ...EMPTY };
  }
}

export function writeOnboardingSkips(next: OnboardingSkipFlags) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SKIP_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function markOnboardingSkipped(key: keyof OnboardingSkipFlags) {
  const current = readOnboardingSkips();
  writeOnboardingSkips({ ...current, [key]: true });
}
