import { createFileRoute, redirect } from "@tanstack/react-router";

/** Meta Ads is out of product scope. */
export const Route = createFileRoute("/ads")({
  beforeLoad: () => {
    throw redirect({ to: "/profits" });
  },
});
