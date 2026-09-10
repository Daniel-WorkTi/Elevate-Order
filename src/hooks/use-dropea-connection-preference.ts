import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearDropeaCredentials,
  getDropeaCredentialStatus,
  saveDropeaCredentials,
  type DropeaCredentialStatus,
} from "@/lib/integrations/dropea/dropea-credentials.server";

export type DropeaConnectCredentials = {
  apiToken: string;
  hmacSecret: string;
};

const LEGACY_KEYS = [
  "elevate-dropea-connection",
  "elevate-dropea-api-token",
  "elevate-dropea-hmac-secret",
  "elevate-dropea-api-key",
] as const;

function purgeLegacyDropeaLocalSecrets() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

const empty: DropeaCredentialStatus = {
  linked: false,
  apiTokenConfigured: false,
  hmacSecretConfigured: false,
  linkedAt: null,
};

/**
 * Dropea connection status from server-stored encrypted credentials.
 * Never persists API tokens in the browser.
 */
export function useDropeaConnectionPreference(workspaceId: string) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    purgeLegacyDropeaLocalSecrets();
  }, []);

  const query = useQuery({
    queryKey: ["connections", "dropea", "credentials", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => getDropeaCredentialStatus({ data: { workspaceId } }),
  });

  const preference = query.data ?? empty;

  const connect = useCallback(
    async (credentials: DropeaConnectCredentials) => {
      const apiToken = credentials.apiToken.trim();
      const hmacSecret = credentials.hmacSecret.trim();
      if (!apiToken || !hmacSecret || !workspaceId) return false;
      setBusy(true);
      try {
        const result = await saveDropeaCredentials({
          data: { workspaceId, apiToken, hmacSecret },
        });
        purgeLegacyDropeaLocalSecrets();
        await queryClient.invalidateQueries({
          queryKey: ["connections", "dropea"],
        });
        return result.ok;
      } finally {
        setBusy(false);
      }
    },
    [queryClient, workspaceId],
  );

  const disconnect = useCallback(async () => {
    if (!workspaceId) return;
    setBusy(true);
    try {
      await clearDropeaCredentials({ data: { workspaceId } });
      purgeLegacyDropeaLocalSecrets();
      await queryClient.invalidateQueries({
        queryKey: ["connections", "dropea"],
      });
    } finally {
      setBusy(false);
    }
  }, [queryClient, workspaceId]);

  return {
    ...preference,
    /** @deprecated Prefer apiTokenConfigured */
    apiKeyConfigured: preference.apiTokenConfigured && preference.hmacSecretConfigured,
    busy: busy || query.isPending,
    /** Credentials never leave the server — sync uses stored secrets. */
    getApiToken: () => null as string | null,
    getHmacSecret: () => null as string | null,
    connect,
    disconnect,
  };
}
