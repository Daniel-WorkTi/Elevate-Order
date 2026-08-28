export type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  };
  status?: string;
};

export type FacebookLoginStatusResponse = {
  status?: string;
  authResponse?: {
    code?: string;
  };
};

export type FacebookSdk = {
  init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
  getLoginStatus?: (
    callback: (response: FacebookLoginStatusResponse) => void,
    force?: boolean,
  ) => void;
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
  redirectUri: string;
};

export type WhatsAppEmbeddedSignupCancelReason =
  "cancelled" | "error" | "no_code" | "https_required" | "finish_missing";

const FINISH_EVENTS = new Set([
  "FINISH",
  "FINISH_ONLY_WABA",
  "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
]);

const FB_LOGIN_OPTIONS = {
  response_type: "code",
  override_default_response_type: true,
  extras: {
    setup: {},
    featureType: "",
    sessionInfoVersion: "3",
  },
} as const;

/** Temporary smoke-test instrumentation — remove after Meta Embedded Signup debug. */
const WA_EMBEDDED_SIGNUP_LOG = "[WA Embedded Signup]";

/** Meta FB.login requires HTTPS (including localhost). */
export function isSecureFacebookLoginContext(): boolean {
  if (typeof window === "undefined") return true;
  return window.location.protocol === "https:";
}

/** Official Meta/Facebook HTTPS postMessage origins (facebook.com + facebook.net). */
export function isMetaTrustedPostMessageOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "facebook.com" ||
      host.endsWith(".facebook.com") ||
      host === "facebook.net" ||
      host.endsWith(".facebook.net")
    );
  } catch {
    return false;
  }
}

/** @deprecated Use isMetaTrustedPostMessageOrigin — kept for tests/back-compat. */
export function isWhatsAppEmbeddedSignupOrigin(origin: string): boolean {
  return isMetaTrustedPostMessageOrigin(origin);
}

/** Page URL used as OAuth redirect_uri when exchanging the Embedded Signup code. */
export function embeddedSignupRedirectUri(): string {
  if (typeof window === "undefined") return "";
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

type EmbeddedSignupMessage = {
  type: string;
  event?: string;
  data?: Record<string, unknown>;
};

function normalizeEmbeddedSignupPayload(raw: unknown): EmbeddedSignupMessage | null {
  let parsed: unknown = raw;

  if (typeof raw === "string") {
    if (!raw.trim()) return null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") return null;

  const candidate = parsed as { type?: unknown; event?: unknown; data?: unknown };
  if (candidate.type !== "WA_EMBEDDED_SIGNUP") return null;

  const message: EmbeddedSignupMessage = { type: "WA_EMBEDDED_SIGNUP" };
  if (typeof candidate.event === "string") message.event = candidate.event;
  if (candidate.data && typeof candidate.data === "object" && !Array.isArray(candidate.data)) {
    message.data = candidate.data as Record<string, unknown>;
  }
  return message;
}

export function parseEmbeddedSignupMessage(raw: unknown): EmbeddedSignupMessage | null {
  return normalizeEmbeddedSignupPayload(raw);
}

function looksLikeOAuthRedirectPayload(raw: string): boolean {
  const trimmed = raw.trim();
  return (
    trimmed.startsWith("data=") ||
    trimmed.startsWith("cb=") ||
    (trimmed.includes("code=") && trimmed.includes("origin=") && !trimmed.startsWith("{"))
  );
}

function safeTopLevelKeys(value: object): string[] {
  return Object.keys(value).slice(0, 12);
}

export type PostMessageDiagnostic = {
  dataType: string;
  payloadFormat: "string-json" | "string-non-json" | "object" | "other";
  jsonParseOk: boolean;
  looksLikeOAuthRedirect: boolean;
  isWhatsAppEmbeddedSignupEvent: boolean;
  messageType?: string;
  messageEvent?: string;
  topLevelKeys?: string[];
  event?: string;
  hasWabaId: boolean;
  hasPhoneNumberId: boolean;
};

export function describePostMessagePayload(data: unknown): PostMessageDiagnostic {
  const dataType = data === null ? "null" : typeof data;
  let payloadFormat: PostMessageDiagnostic["payloadFormat"] = "other";
  let jsonParseOk = false;
  let looksLikeOAuthRedirect = false;
  let parsed: unknown = data;
  let messageType: string | undefined;
  let messageEvent: string | undefined;
  let topLevelKeys: string[] | undefined;

  if (typeof data === "string") {
    looksLikeOAuthRedirect = looksLikeOAuthRedirectPayload(data);
    try {
      parsed = JSON.parse(data);
      jsonParseOk = true;
      payloadFormat = "string-json";
    } catch {
      payloadFormat = "string-non-json";
      parsed = null;
    }
  } else if (data !== null && typeof data === "object") {
    jsonParseOk = true;
    payloadFormat = "object";
    parsed = data;
  }

  if (parsed && typeof parsed === "object") {
    const candidate = parsed as { type?: unknown; event?: unknown };
    if (typeof candidate.type === "string") messageType = candidate.type;
    if (typeof candidate.event === "string") messageEvent = candidate.event;
    topLevelKeys = safeTopLevelKeys(parsed);
  }

  const message = normalizeEmbeddedSignupPayload(data);

  return {
    dataType,
    payloadFormat,
    jsonParseOk,
    looksLikeOAuthRedirect,
    isWhatsAppEmbeddedSignupEvent: message?.type === "WA_EMBEDDED_SIGNUP",
    ...(messageType ? { messageType } : {}),
    ...(messageEvent ? { messageEvent } : {}),
    ...(topLevelKeys?.length ? { topLevelKeys } : {}),
    ...(message?.event ? { event: message.event } : {}),
    hasWabaId: typeof message?.data?.["waba_id"] === "string",
    hasPhoneNumberId: typeof message?.data?.["phone_number_id"] === "string",
  };
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

const SESSION_WAIT_MS = 15_000;

export const WA_EMBEDDED_SIGNUP_FINISH_MISSING_MESSAGE =
  "O login da Meta foi concluído, mas o WhatsApp Embedded Signup não retornou os dados do número.";

function waEmbeddedSignupLog(message: string, details?: Record<string, unknown>): void {
  if (details) {
    console.info(WA_EMBEDDED_SIGNUP_LOG, message, details);
    return;
  }
  console.info(WA_EMBEDDED_SIGNUP_LOG, message);
}

function probeFacebookLoginStatus(fb: FacebookSdk): void {
  if (!fb.getLoginStatus) {
    waEmbeddedSignupLog("FB.getLoginStatus unavailable on window.FB");
    return;
  }

  try {
    fb.getLoginStatus((response) => {
      waEmbeddedSignupLog("FB.getLoginStatus result", {
        status: response.status ?? "unknown",
        hasAuthResponse: Boolean(response.authResponse),
        hasAuthCode: Boolean(response.authResponse?.code),
      });
    });
  } catch (error) {
    waEmbeddedSignupLog("FB.getLoginStatus threw", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Launch Embedded Signup synchronously from a user click handler.
 * Waits for WA_EMBEDDED_SIGNUP FINISH before completing (code alone is not enough).
 */
export function startWhatsAppEmbeddedSignup(
  configId: string,
  handlers: {
    onComplete: (payload: WhatsAppEmbeddedSignupCompletePayload) => void;
    onCancel: (reason: WhatsAppEmbeddedSignupCancelReason) => void;
  },
): void {
  waEmbeddedSignupLog("startWhatsAppEmbeddedSignup invoked", {
    https: isSecureFacebookLoginContext(),
    hasFb: Boolean(window.FB),
    hasGetLoginStatus: Boolean(window.FB?.getLoginStatus),
    configIdPresent: Boolean(configId),
  });

  if (!isSecureFacebookLoginContext()) {
    waEmbeddedSignupLog("flow stopped: HTTPS required for FB.login");
    handlers.onCancel("https_required");
    return;
  }

  if (!window.FB) {
    waEmbeddedSignupLog("flow stopped: window.FB missing");
    handlers.onCancel("error");
    return;
  }

  probeFacebookLoginStatus(window.FB);

  let settled = false;
  let session: WhatsAppEmbeddedSignupSession = {};
  let code: string | null = null;
  let signupFinished = false;
  let sessionTimer: ReturnType<typeof setTimeout> | null = null;
  let listenerActive = true;

  const finish = () => {
    if (settled || !code || !signupFinished) return;
    settled = true;
    cleanup();
    waEmbeddedSignupLog("flow completed", {
      hasAuthCode: Boolean(code),
      hasWabaId: Boolean(session.wabaId),
      hasPhoneNumberId: Boolean(session.phoneNumberId),
      signupFinished,
    });
    handlers.onComplete({
      code,
      session,
      redirectUri: embeddedSignupRedirectUri(),
    });
  };

  const abort = (reason: WhatsAppEmbeddedSignupCancelReason) => {
    if (settled) return;
    settled = true;
    cleanup();
    waEmbeddedSignupLog("flow aborted", {
      reason,
      hasAuthCode: Boolean(code),
      hasWabaId: Boolean(session.wabaId),
      hasPhoneNumberId: Boolean(session.phoneNumberId),
      signupFinished,
      listenerWasActive: listenerActive,
    });
    handlers.onCancel(reason);
  };

  const tryFinish = () => {
    if (!code) {
      waEmbeddedSignupLog("tryFinish waiting for authorization code");
      return;
    }
    if (signupFinished) {
      finish();
      return;
    }
    waEmbeddedSignupLog("tryFinish waiting for FINISH event", {
      hasAuthCode: true,
      hasWabaId: Boolean(session.wabaId),
      hasPhoneNumberId: Boolean(session.phoneNumberId),
      listenerActive,
    });
    if (!sessionTimer) {
      sessionTimer = setTimeout(() => {
        waEmbeddedSignupLog("FINISH wait timed out without WA_EMBEDDED_SIGNUP FINISH", {
          hasAuthCode: Boolean(code),
          hasWabaId: Boolean(session.wabaId),
          hasPhoneNumberId: Boolean(session.phoneNumberId),
          listenerActive,
        });
        abort("finish_missing");
      }, SESSION_WAIT_MS);
    }
  };

  const onMessage = (event: MessageEvent) => {
    if (!isMetaTrustedPostMessageOrigin(event.origin)) return;

    const payloadSummary = describePostMessagePayload(event.data);
    waEmbeddedSignupLog("postMessage received", {
      origin: event.origin,
      ...payloadSummary,
    });

    if (payloadSummary.looksLikeOAuthRedirect) {
      waEmbeddedSignupLog(
        "postMessage is OAuth redirect fragment, not WA_EMBEDDED_SIGNUP JSON — Embedded Signup session events did not fire",
        {
          origin: event.origin,
          jsonParseOk: payloadSummary.jsonParseOk,
        },
      );
    } else if (payloadSummary.jsonParseOk && !payloadSummary.isWhatsAppEmbeddedSignupEvent) {
      waEmbeddedSignupLog("postMessage parsed JSON but type is not WA_EMBEDDED_SIGNUP", {
        origin: event.origin,
        messageType: payloadSummary.messageType ?? "missing",
        ...(payloadSummary.messageEvent ? { messageEvent: payloadSummary.messageEvent } : {}),
        ...(payloadSummary.topLevelKeys ? { topLevelKeys: payloadSummary.topLevelKeys } : {}),
      });
    } else if (!payloadSummary.jsonParseOk && payloadSummary.payloadFormat === "string-non-json") {
      waEmbeddedSignupLog("postMessage string is not valid JSON", {
        origin: event.origin,
        dataLength: typeof event.data === "string" ? event.data.length : 0,
      });
    }

    const message = normalizeEmbeddedSignupPayload(event.data);
    if (!message) return;

    const eventName = String(message.event ?? "").toUpperCase();
    waEmbeddedSignupLog("WA_EMBEDDED_SIGNUP event received", {
      origin: event.origin,
      event: eventName || "unknown",
      payloadFormat: payloadSummary.payloadFormat,
      hasWabaId: typeof message.data?.["waba_id"] === "string",
      hasPhoneNumberId: typeof message.data?.["phone_number_id"] === "string",
    });

    if (message.data) {
      session = { ...session, ...sessionFromEmbeddedSignupData(message.data) };
    }

    if (FINISH_EVENTS.has(eventName)) {
      waEmbeddedSignupLog("embedded signup FINISH event", {
        event: eventName,
        origin: event.origin,
      });
      signupFinished = true;
      tryFinish();
      return;
    }

    if (eventName === "CANCEL") {
      waEmbeddedSignupLog("embedded signup CANCEL event", { origin: event.origin });
      abort("cancelled");
      return;
    }

    if (eventName === "ERROR") {
      waEmbeddedSignupLog("embedded signup ERROR event", { origin: event.origin });
      abort("error");
    }
  };

  const cleanup = () => {
    listenerActive = false;
    window.removeEventListener("message", onMessage);
    if (sessionTimer) clearTimeout(sessionTimer);
  };

  window.addEventListener("message", onMessage);
  waEmbeddedSignupLog("message listener registered before FB.login", { listenerActive: true });

  const loginOptions = {
    config_id: configId,
    ...FB_LOGIN_OPTIONS,
  };

  waEmbeddedSignupLog("calling FB.login", {
    config_id: Boolean(configId),
    response_type: FB_LOGIN_OPTIONS.response_type,
    override_default_response_type: FB_LOGIN_OPTIONS.override_default_response_type,
    hasExtrasSetup: Boolean(FB_LOGIN_OPTIONS.extras.setup),
    featureType: FB_LOGIN_OPTIONS.extras.featureType,
    sessionInfoVersion: FB_LOGIN_OPTIONS.extras.sessionInfoVersion,
  });

  window.FB.login((response) => {
    waEmbeddedSignupLog("FB.login callback executed", {
      status: response.status ?? "unknown",
      hasAuthResponse: Boolean(response.authResponse),
      hasAuthCode: Boolean(response.authResponse?.code),
      listenerActive,
    });

    const authCode = response.authResponse?.code;
    if (!authCode) {
      console.info(`${WA_EMBEDDED_SIGNUP_LOG} FB.login completed without authorization code`);
      abort(response.status === "unknown" ? "cancelled" : "no_code");
      return;
    }
    code = authCode;
    tryFinish();
  }, loginOptions);
}
