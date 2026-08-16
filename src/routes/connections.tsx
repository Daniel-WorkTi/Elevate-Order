import { Outlet, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const connectionsSearchSchema = z.object({
  source: z.enum(["shopify", "dropi", "dropea"]).optional(),
});

export const Route = createFileRoute("/connections")({
  validateSearch: connectionsSearchSchema,
  component: ConnectionsLayout,
});

function ConnectionsLayout() {
  return <Outlet />;
}
