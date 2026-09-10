import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  connectShopifyManualStore,
  disconnectShopifyStore,
  getShopifyOauthStatus,
} from "@/lib/integrations/shopify/oauth.functions";
import { normalizeShopifyDomain } from "@/lib/integrations/shopify/shopify-normalize";

export type StoreConnectInput = {
  storeName: string;
  storeDomain: string;
  accessToken: string;
};

export { normalizeShopifyDomain };

const LEGACY_KEYS = ["elevate-store-connection", "elevate-shopify-access-token"] as const;

function purgeLegacyShopifyLocalSecrets() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/**
 * Shopify link state from server (OAuth or manual token stored in shopify_stores).
 * Never persists Admin API tokens in the browser.
 */
export function useStoreConnectionPreference(workspaceId = "") {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [manualLabel, setManualLabel] = useState<{
    storeName: string | null;
    storeDomain: string | null;
  }>({ storeName: null, storeDomain: null });

  useEffect(() => {
    purgeLegacyShopifyLocalSecrets();
  }, []);

  const oauthQuery = useQuery({
    queryKey: ["connections", "shopify", "oauth"],
    queryFn: () => getShopifyOauthStatus(),
  });

  const oauth = oauthQuery.data;
  const linked = Boolean(oauth?.connected && oauth.shopDomain);
  const storeDomain = oauth?.shopDomain ?? manualLabel.storeDomain;
  const storeName = manualLabel.storeName ?? oauth?.shopDomain ?? null;

  const connect = useCallback(
    async (input: StoreConnectInput) => {
      if (!workspaceId) return false;
      const storeNameValue = input.storeName.trim();
      const storeDomainValue = normalizeShopifyDomain(input.storeDomain);
      const accessToken = input.accessToken.trim();
      if (!storeNameValue || !storeDomainValue || !accessToken) return false;

      setBusy(true);
      try {
        const result = await connectShopifyManualStore({
          data: {
            workspaceId,
            storeName: storeNameValue,
            storeDomain: storeDomainValue,
            accessToken,
          },
        });
        purgeLegacyShopifyLocalSecrets();
        if (!result.ok) return false;
        setManualLabel({ storeName: storeNameValue, storeDomain: result.shopDomain });
        await queryClient.invalidateQueries({ queryKey: ["connections", "shopify"] });
        return true;
      } finally {
        setBusy(false);
      }
    },
    [queryClient, workspaceId],
  );

  const disconnect = useCallback(async () => {
    setBusy(true);
    try {
      await disconnectShopifyStore();
      purgeLegacyShopifyLocalSecrets();
      setManualLabel({ storeName: null, storeDomain: null });
      await queryClient.invalidateQueries({ queryKey: ["connections", "shopify"] });
    } finally {
      setBusy(false);
    }
  }, [queryClient]);

  return {
    linked,
    linkedAt: linked ? oauth?.lastSyncAt ?? null : null,
    storeName,
    storeDomain,
    accessTokenConfigured: linked,
    busy: busy || oauthQuery.isPending,
    /** Tokens never leave the server. */
    getAccessToken: () => null as string | null,
    connect,
    disconnect,
  };
}
