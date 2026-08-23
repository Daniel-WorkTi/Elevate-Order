import type { TemplateKind } from "@/lib/templates/types";

export const TEMPLATE_KIND_I18N = {
  address_problem: {
    name: "templates.kind.address_problem.name",
    description: "templates.kind.address_problem.description",
    purpose: "templates.kind.address_problem.purpose",
  },
  delivery_attempt: {
    name: "templates.kind.delivery_attempt.name",
    description: "templates.kind.delivery_attempt.description",
    purpose: "templates.kind.delivery_attempt.purpose",
  },
  tracking_update: {
    name: "templates.kind.tracking_update.name",
    description: "templates.kind.tracking_update.description",
    purpose: "templates.kind.tracking_update.purpose",
  },
  follow_up: {
    name: "templates.kind.follow_up.name",
    description: "templates.kind.follow_up.description",
    purpose: "templates.kind.follow_up.purpose",
  },
  confirmation: {
    name: "templates.kind.confirmation.name",
    description: "templates.kind.confirmation.description",
    purpose: "templates.kind.confirmation.purpose",
  },
  incident: {
    name: "templates.kind.incident.name",
    description: "templates.kind.incident.description",
    purpose: "templates.kind.incident.purpose",
  },
  cancelled: {
    name: "templates.kind.cancelled.name",
    description: "templates.kind.cancelled.description",
    purpose: "templates.kind.cancelled.purpose",
  },
} as const satisfies Record<
  TemplateKind,
  { name: string; description: string; purpose: string }
>;

export function templateKindNameKey(kind: TemplateKind) {
  return TEMPLATE_KIND_I18N[kind].name;
}
