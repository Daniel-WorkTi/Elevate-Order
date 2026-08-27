import { useCallback, useEffect, useRef, useState } from "react";

import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";
import { resolveActiveWorkspace, type WorkspaceSummary } from "@/lib/workspace/workspace.functions";

const PREFERENCE_KEY = "elevate-current-workspace-id";

function readPreference(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return parseWorkspaceId(window.localStorage.getItem(PREFERENCE_KEY));
  } catch {
    return null;
  }
}

function writePreference(id: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFERENCE_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * UI preference for the active workspace.
 * Authorization is always validated server-side — localStorage is never a tenant authority.
 */
export function useWorkspaceId() {
  const [workspaceId, setWorkspaceIdState] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const booting = useRef(false);

  const refresh = useCallback(async () => {
    const preferred = readPreference();
    try {
      const result = await resolveActiveWorkspace({
        data: preferred ? { preferredWorkspaceId: preferred } : {},
      });
      setWorkspaces(result.workspaces);
      setWorkspaceIdState(result.workspace.id);
      writePreference(result.workspace.id);
      setError(null);
      setReady(true);
      return result.workspace.id;
    } catch (err) {
      console.error("[workspace] resolveActiveWorkspace failed", err);
      setError("Unable to resolve workspace.");
      setWorkspaceIdState("");
      setWorkspaces([]);
      setReady(true);
      return "";
    }
  }, []);

  useEffect(() => {
    if (booting.current) return;
    booting.current = true;
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== PREFERENCE_KEY) return;
      void refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const setWorkspaceId = useCallback(
    (nextId: string) => {
      const parsed = parseWorkspaceId(nextId);
      if (!parsed) return;
      const owned = workspaces.some((w) => w.id === parsed);
      if (!owned) {
        void refresh();
        return;
      }
      writePreference(parsed);
      setWorkspaceIdState(parsed);
    },
    [refresh, workspaces],
  );

  /** @deprecated No longer creates random UUIDs. Resolves an authorized workspace instead. */
  const resetWorkspaceId = useCallback(() => {
    void refresh();
    return workspaceId;
  }, [refresh, workspaceId]);

  return {
    workspaceId,
    workspaces,
    ready,
    error,
    setWorkspaceId,
    refresh,
    resetWorkspaceId,
  };
}
