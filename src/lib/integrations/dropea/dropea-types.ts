export type DropeaConnectionStatus =
  | "connected"
  | "configured"
  | "error"
  | "not_configured";

export type DropeaConnectionSummary = {
  status: DropeaConnectionStatus;
  method: "api";
  apiBaseUrl: string;
  serverConfigured: boolean;
  lastSyncAt: string | null;
  orderCount: number | null;
  eventsToday: number | null;
  errorMessage: string | null;
};

export type DropeaActivityEvent = {
  id: string;
  orderId: number;
  eventDate: string;
  statusName: string | null;
  details: string | null;
};

export type DropeaDashboardResult = {
  summary: DropeaConnectionSummary;
  recentEvents: DropeaActivityEvent[];
  error: string | null;
};

export const DROPEA_API_BASE = "https://api.dropea.com/api/v1";
