export type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  };
  status?: string;
};

export type FacebookSdk = {
  init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

export type WhatsAppEmbeddedSignupSession = {
  wabaId?: string;
  phoneNumberId?: string;
  businessId?: string;
};

export type WhatsAppEmbeddedSignupCompletePayload = {
  code: string;
  session: WhatsAppEmbeddedSignupSession;
};

export type WhatsAppEmbeddedSignupCancelReason = "cancelled" | "error" | "no_code";

const FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_ONLY_WABA",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
]);

const FACEBOOK_ORIGINS = new Set(["https://www.facebook.com", "https://web.facebook.com"]);

export function isWhatsAppEmbeddedSignupOrigin(origin: string): boolean {
  return FACEBOOK_ORIGINS.has(origin);
}

export function parseEmbeddedSignupMessage(raw: unknown): {
  type: string;
  event?: string;
  data?: Record<string, unknown>;
} | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as {
      type?: string;
      event?: string;
      data?: Record<string, unknown>;
    };
    if (parsed?.type !== "WA_EMBEDDED_SIGNUP") return null;
    return {
      type: parsed.type,
      ...(parsed.event ? { event: parsed.event } : {}),
      ...(parsed.data ? { data: parsed.data } : {}),
    };
  } catch {
    return null;
  }
}

export function sessionFromEmbeddedSignupData(
  data: Record<string, unknown> | undefined,
): WhatsAppEmbeddedSignupSession {
  const session: WhatsAppEmbeddedSignupSession = {};
  if (typeof data?.["waba_id"] === "string") session.wabaId = data["waba_id"];
  if (typeof data?.["phone_number_id"] === "string")
    session.phoneNumberId = data["phone_number_id"];
  if (typeof data?.["business_id"] === "string") session.businessId = data["business_id"];
  return session;
}

let sdkLoadPromise: Promise<void> | null = null;

/** Load Meta JS SDK once per page lifetime. */
export function loadMetaSdk(appId: string, sdkVersion: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.FB) return Promise.resolve();
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: true,
        version: sdkVersion,
      });
      resolve();
    };

    if (document.getElementById("facebook-jssdk")) {
      if (window.FB) resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => {
      sdkLoadPromise = null;
      reject(new Error("Unable to load Meta SDK."));
    };
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

const SESSION_WAIT_MS = 5_000;

/**
 * Launch Embedded Signup synchronously from a user click handler.
 * Correlates FB.login code with WA_EMBEDDED_SIGNUP postMessage (may arrive out of order).
 */
export function startWhatsAppEmbeddedSignup(
  configId: string,
  handlers: {
    onComplete: (payload: WhatsAppEmbeddedSignupCompletePayload) => void;
    onCancel: (reason: WhatsAppEmbeddedSignupCancelReason) => void;
  },
): void {
  if (!window.FB) {
    handlers.onCancel("error");
    return;
  }

  let settled = false;
  let session: WhatsAppEmbeddedSignupSession = {};
  let code: string | null = null;
  let sessionTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    if (settled || !code) return;
    settled = true;
    cleanup();
    handlers.onComplete({ code, session });
  };

  const abort = (reason: WhatsAppEmbeddedSignupCancelReason) => {
    if (settled) return;
    settled = true;
    cleanup();
    handlers.onCancel(reason);
  };

  const maybeFinish = () => {
    if (!code) return;
    if (sessionTimer) clearTimeout(sessionTimer);
    sessionTimer = setTimeout(finish, SESSION_WAIT_MS);
    finish();
  };

  const onMessage = (event: MessageEvent) => {
    if (!isWhatsAppEmbeddedSignupOrigin(event.origin)) return;
    const message = parseEmbeddedSignupMessage(event.data);
    if (!message) return;

    const eventName = String(message.event ?? "").toUpperCase();
    if (message.data) {
      session = { ...session, ...sessionFromEmbeddedSignupData(message.data) };
    }

    if (FINISH_EVENTS.has(eventName)) {
      maybeFinish();
      return;
    }

    if (eventName === "CANCEL") {
      abort("cancelled");
      return;
    }

    if (eventName === "ERROR") {
      abort("error");
    }
  };

  const cleanup = () => {
    window.removeEventListener("message", onMessage);
    if (sessionTimer) clearTimeout(sessionTimer);
  };

  window.addEventListener("message", onMessage);

  window.FB.login(
    (response) => {
      const authCode = response.authResponse?.code;
      if (!authCode) {
        abort(response.status === "unknown" ? "cancelled" : "no_code");
        return;
      }
      code = authCode;
      maybeFinish();
    },
    {
      config_id: configId,
      response_type: "code",
      override_default_response_type: true,
      extras: {
        setup: {},
        sessionInfoVersion: "3",
      },
    },
  );
}
