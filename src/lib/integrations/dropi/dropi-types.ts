export type DropiConnectionStatus =
  | "connected"
  | "configured"
  | "error"
  | "not_configured";

export type DropiFieldDefinition = {
  key: string;
  label: string;
  description: string;
  /** Template token when usable in customer messages */
  templateVariable?: string;
  optional: boolean;
};

export type DropiWebhookEventRow = {
  id: string;
  orderId: number;
  eventDate: string;
  statusName: string | null;
  details: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  shippingCompany: string | null;
  total: number | null;
  source: string;
  /** Always "processed" for persisted rows — failures are not stored today. */
  result: "processed";
  /** Pretty-printable JSON string of stored payload, if any. */
  rawJson: string | null;
};

export type DropiConnectionSummary = {
  status: DropiConnectionStatus;
  method: "webhook";
  webhookPath: string;
  /** Path + optional ?token= for paste into Dropi. */
  webhookRelativeUrl: string;
  authConfigured: boolean;
  serverConfigured: boolean;
  lastWebhookAt: string | null;
  lastSuccessfulEventAt: string | null;
  orderCount: number | null;
  eventsToday: number | null;
  /** Not tracked in DB today — always null. */
  failedEventsToday: number | null;
  errorMessage: string | null;
};

export type DropiDashboardResult = {
  summary: DropiConnectionSummary;
  fields: DropiFieldDefinition[];
  recentEvents: DropiWebhookEventRow[];
  error: string | null;
};
