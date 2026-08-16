import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Integração API → Dropi Pro connection settings. */
export const Route = createFileRoute("/integracao-api")({
  beforeLoad: () => {
    throw redirect({ to: "/connections/dropi" });
  },
});
