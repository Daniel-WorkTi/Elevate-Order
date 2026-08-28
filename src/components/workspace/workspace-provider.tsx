import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { parseWorkspaceId } from "@/lib/workspace/parse-workspace-id";
import { resolveActiveWorkspace, type WorkspaceSummary } from "@/lib/workspace/workspace.functions";

const PREFERENCE_KEY = "elevate-current-workspace-id";
const RESOLVE_TIMEOUT_MS = 15_000;

type WorkspaceContextValue = {
  workspaceId: string;
  workspaces: WorkspaceSummary[];
  ready: boolean;
  error: string | null;
  setWorkspaceId: (nextId: string) => void;
  refresh: () => Promise<string>;
  resetWorkspaceId: () => string;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

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

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState("");
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const booting = useRef(false);
  const refreshInFlight = useRef<Promise<string> | null>(null);

  const refresh = useCallback(async (): Promise<string> => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const run = (async () => {
      const preferred = readPreference();
      try {
        const result = await Promise.race([
          resolveActiveWorkspace({
            data: preferred ? { preferredWorkspaceId: preferred } : {},
          }),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("workspace_resolve_timeout")), RESOLVE_TIMEOUT_MS);
          }),
        ]);
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
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = run;
    return run;
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

  const resetWorkspaceId = useCallback(() => {
    void refresh();
    return workspaceId;
  }, [refresh, workspaceId]);

  const value = useMemo(
    (): WorkspaceContextValue => ({
      workspaceId,
      workspaces,
      ready,
      error,
      setWorkspaceId,
      refresh,
      resetWorkspaceId,
    }),
    [workspaceId, workspaces, ready, error, setWorkspaceId, refresh, resetWorkspaceId],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspaceId must be used within WorkspaceProvider");
  }
  return ctx;
}
