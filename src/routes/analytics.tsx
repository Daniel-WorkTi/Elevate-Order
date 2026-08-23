import { createFileRoute, redirect } from "@tanstack/react-router";

/** Analytics dashboard is out of product scope. */
export const Route = createFileRoute("/analytics")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
