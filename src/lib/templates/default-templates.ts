import type { MessageTemplateRecord, TemplateKind } from "@/lib/templates/types";

type DefaultSeed = {
  kind: TemplateKind;
  name: string;
  description: string;
  purpose: string;
  content: string;
};

/** Order matches the operational Templates mock (left rail). */
const SEEDS: readonly DefaultSeed[] = [
  {
    kind: "address_problem",
    name: "Address problem",
    description: "Invalid or incomplete delivery address",
    purpose: "Used when the carrier reports an invalid or incomplete delivery address.",
    content: `Olá {{customer_name}} 👋

Identificámos um problema com a entrega do pedido {{order_id}}.

Motivo:
{{details}}

Transportadora:
{{shipping_company}}

{{tracking_section}}

Pode confirmar os seus dados de entrega?`,
  },
  {
    kind: "delivery_attempt",
    name: "Delivery attempt",
    description: "Failed delivery attempt follow-up",
    purpose: "Used after a failed delivery attempt by the carrier.",
    content: `Olá {{customer_name}} 👋

Houve uma tentativa de entrega do pedido {{order_id}}.

{{details}}

Transportadora: {{shipping_company}}

{{tracking_section}}

Qual o melhor horário para uma nova tentativa?`,
  },
  {
    kind: "tracking_update",
    name: "Tracking update",
    description: "Share tracking after shipment",
    purpose: "Share tracking information for an in-transit order.",
    content: `Olá {{customer_name}} 👋

Atualização do pedido {{order_id}}.

Status: {{status_name}}
Transportadora: {{shipping_company}}

{{tracking_section}}

Qualquer dúvida, estamos disponíveis.`,
  },
  {
    kind: "follow_up",
    name: "No response follow-up",
    description: "Customer has not replied yet",
    purpose: "Follow up when the customer has not replied.",
    content: `Olá {{customer_name}} 👋

Ainda não recebemos confirmação sobre o pedido {{order_id}}.

{{details}}

{{tracking_section}}

Pode responder para avançarmos?`,
  },
  {
    kind: "confirmation",
    name: "Order confirmation",
    description: "Confirm a new or paid order",
    purpose: "Confirm a new or paid order to the customer.",
    content: `Olá {{customer_name}} 👋

Confirmamos o seu pedido {{order_id}}.

Status: {{status_name}}
Total: {{total}}

{{tracking_section}}

Obrigado.`,
  },
  {
    kind: "incident",
    name: "Incident",
    description: "General delivery incident contact",
    purpose: "General delivery incident contact message.",
    content: `Olá {{customer_name}} 👋

Entramos em contacto sobre o seu pedido {{order_id}}.

A transportadora informou um problema na entrega:

{{details}}

Transportadora: {{shipping_company}}

{{tracking_section}}

Pode confirmar os seus dados de entrega?`,
  },
  {
    kind: "cancelled",
    name: "Cancelled order",
    description: "Inform the customer of a cancellation",
    purpose: "Inform the customer that the order was cancelled.",
    content: `Olá {{customer_name}} 👋

O pedido {{order_id}} foi cancelado.

{{details}}

Se precisar de ajuda, responda a esta mensagem.`,
  },
] as const;

function templateId(kind: TemplateKind): string {
  return kind;
}

export function buildDefaultTemplates(): MessageTemplateRecord[] {
  return SEEDS.map((seed) => ({
    id: templateId(seed.kind),
    kind: seed.kind,
    name: seed.name,
    description: seed.description,
    purpose: seed.purpose,
    content: seed.content,
    updatedAt: null,
    isCustom: false,
  }));
}

export function defaultContentFor(kind: TemplateKind): string {
  const seed = SEEDS.find((item) => item.kind === kind);
  return seed?.content ?? "";
}

export function allDefaultTemplates(): MessageTemplateRecord[] {
  return buildDefaultTemplates();
}

export const TEMPLATE_KIND_ORDER: readonly TemplateKind[] = SEEDS.map((s) => s.kind);
