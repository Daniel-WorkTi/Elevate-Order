import { DROPEA_API_BASE } from "@/lib/integrations/dropea/dropea-types";

const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export class DropeaApiError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "DropeaApiError";
    this.status = status;
  }
}

async function dropeaFetch(path: string, apiToken: string): Promise<unknown> {
  const token = apiToken.trim();
  if (!token) throw new DropeaApiError("Missing Dropea API token");

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${DROPEA_API_BASE}${path}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-KEY": token,
        },
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        throw new DropeaApiError("Dropea token rejected", response.status);
      }
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        lastError = new DropeaApiError(`Dropea HTTP ${response.status}`, response.status);
        continue;
      }
      if (!response.ok) {
        throw new DropeaApiError(`Dropea HTTP ${response.status}`, response.status);
      }
      return (await response.json()) as unknown;
    } catch (error) {
      lastError = error;
      if (error instanceof DropeaApiError && error.status !== null && error.status < 500) {
        throw error;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  if (lastError instanceof DropeaApiError) throw lastError;
  throw new DropeaApiError("Dropea API unavailable");
}

/** Live Dropea order list. Token stays on the server for this call. */
export async function fetchDropeaOrders(apiToken: string): Promise<unknown> {
  return dropeaFetch("/order", apiToken);
}
