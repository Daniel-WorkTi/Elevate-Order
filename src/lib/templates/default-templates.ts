import type { LanguageCode } from "@/lib/i18n/languages";
import type { MessageTemplateRecord, TemplateKind } from "@/lib/templates/types";

type DefaultSeed = {
  kind: TemplateKind;
  name: string;
  description: string;
  purpose: string;
  /** pt is the product default; other langs fall back en → pt when missing. */
  content: Partial<Record<LanguageCode, string>> & { pt: string; en: string; es: string };
};

/** Order matches the operational Templates left rail. */
const SEEDS: readonly DefaultSeed[] = [
  {
    kind: "address_problem",
    name: "Address problem",
    description: "Invalid or incomplete delivery address",
    purpose: "Used when the carrier reports an invalid or incomplete delivery address.",
    content: {
      pt: `Olá {{customer_name}} 👋

Identificámos um problema com a entrega do pedido {{order_id}}.

Motivo:
{{details}}

Transportadora:
{{shipping_company}}

{{tracking_section}}

Pode confirmar os seus dados de entrega?`,
      en: `Hi {{customer_name}} 👋

We found a problem with the delivery of order {{order_id}}.

Reason:
{{details}}

Carrier:
{{shipping_company}}

{{tracking_section}}

Could you confirm your delivery details?`,
      es: `Hola {{customer_name}} 👋

Detectamos un problema con la entrega del pedido {{order_id}}.

Motivo:
{{details}}

Transportista:
{{shipping_company}}

{{tracking_section}}

¿Puede confirmar sus datos de entrega?`,
    },
  },
  {
    kind: "delivery_attempt",
    name: "Delivery attempt",
    description: "Failed delivery attempt follow-up",
    purpose: "Used after a failed delivery attempt by the carrier.",
    content: {
      pt: `Olá {{customer_name}} 👋

Houve uma tentativa de entrega do pedido {{order_id}}.

{{details}}

Transportadora: {{shipping_company}}

{{tracking_section}}

Qual o melhor horário para uma nova tentativa?`,
      en: `Hi {{customer_name}} 👋

There was a delivery attempt for order {{order_id}}.

{{details}}

Carrier: {{shipping_company}}

{{tracking_section}}

What is the best time for another attempt?`,
      es: `Hola {{customer_name}} 👋

Hubo un intento de entrega del pedido {{order_id}}.

{{details}}

Transportista: {{shipping_company}}

{{tracking_section}}

¿Cuál es el mejor horario para un nuevo intento?`,
    },
  },
  {
    kind: "tracking_update",
    name: "Tracking update",
    description: "Share tracking after shipment",
    purpose: "Share tracking information for an in-transit order.",
    content: {
      pt: `Olá {{customer_name}} 👋

Atualização do pedido {{order_id}}.

Status: {{status_name}}
Transportadora: {{shipping_company}}

{{tracking_section}}

Qualquer dúvida, estamos disponíveis.`,
      en: `Hi {{customer_name}} 👋

Update on order {{order_id}}.

Status: {{status_name}}
Carrier: {{shipping_company}}

{{tracking_section}}

If you have any questions, we are here to help.`,
      es: `Hola {{customer_name}} 👋

Actualización del pedido {{order_id}}.

Estado: {{status_name}}
Transportista: {{shipping_company}}

{{tracking_section}}

Si tiene alguna duda, estamos disponibles.`,
    },
  },
  {
    kind: "follow_up",
    name: "No response follow-up",
    description: "Customer has not replied yet",
    purpose: "Follow up when the customer has not replied.",
    content: {
      pt: `Olá {{customer_name}} 👋

Ainda não recebemos confirmação sobre o pedido {{order_id}}.

{{details}}

{{tracking_section}}

Pode responder para avançarmos?`,
      en: `Hi {{customer_name}} 👋

We still have not received confirmation about order {{order_id}}.

{{details}}

{{tracking_section}}

Could you reply so we can continue?`,
      es: `Hola {{customer_name}} 👋

Todavía no hemos recibido confirmación sobre el pedido {{order_id}}.

{{details}}

{{tracking_section}}

¿Puede responder para avanzar?`,
    },
  },
  {
    kind: "confirmation",
    name: "Order confirmation",
    description: "Request COD confirmation from the customer",
    purpose: "Ask the customer to confirm or cancel a pending COD order via WhatsApp reply.",
    content: {
      pt: `Olá {{customer_name}} 👋

Precisamos da sua confirmação para enviar o pedido {{order_id}}.

Total: {{total}}
Status: {{status_name}}

Para confirmar o envio, responda:
SIM

Para cancelar, responda:
NÃO

(Ou escreva "Sim, confirmo" / "Pode enviar".)`,
      en: `Hi {{customer_name}} 👋

We need your confirmation to ship order {{order_id}}.

Total: {{total}}
Status: {{status_name}}

To confirm shipment, reply:
YES

To cancel, reply:
NO

(Or write "Yes, confirm" / "You can ship".)`,
      es: `Hola {{customer_name}} 👋

Necesitamos su confirmación para enviar el pedido {{order_id}}.

Total: {{total}}
Estado: {{status_name}}

Para confirmar el envío, responda:
SI

Para cancelar, responda:
NO

(O escriba "Sí, confirmo" / "Puede enviar".)`,
    },
  },
  {
    kind: "incident",
    name: "Incident",
    description: "General delivery incident contact",
    purpose: "General delivery incident contact message.",
    content: {
      pt: `Olá {{customer_name}} 👋

Entramos em contacto sobre o seu pedido {{order_id}}.

A transportadora informou um problema na entrega:

{{details}}

Transportadora: {{shipping_company}}

{{tracking_section}}

Pode confirmar os seus dados de entrega?`,
      en: `Hi {{customer_name}} 👋

We are contacting you about order {{order_id}}.

The carrier reported a delivery problem:

{{details}}

Carrier: {{shipping_company}}

{{tracking_section}}

Could you confirm your delivery details?`,
      es: `Hola {{customer_name}} 👋

Nos ponemos en contacto sobre su pedido {{order_id}}.

El transportista informó un problema en la entrega:

{{details}}

Transportista: {{shipping_company}}

{{tracking_section}}

¿Puede confirmar sus datos de entrega?`,
    },
  },
  {
    kind: "cancelled",
    name: "Cancelled order",
    description: "Inform the customer of a cancellation",
    purpose: "Inform the customer that the order was cancelled.",
    content: {
      pt: `Olá {{customer_name}} 👋

O pedido {{order_id}} foi cancelado.

{{details}}

Se precisar de ajuda, responda a esta mensagem.`,
      en: `Hi {{customer_name}} 👋

Order {{order_id}} was cancelled.

{{details}}

If you need help, reply to this message.`,
      es: `Hola {{customer_name}} 👋

El pedido {{order_id}} fue cancelado.

{{details}}

Si necesita ayuda, responda a este mensaje.`,
    },
  },
] as const;

export const TEMPLATE_LANGUAGES: readonly LanguageCode[] = [
  "pt",
  "en",
  "es",
  "pl",
  "fr",
  "it",
  "de",
];

export const DEFAULT_TEMPLATE_LANGUAGE: LanguageCode = "pt";

function templateId(kind: TemplateKind): string {
  return kind;
}

export function resolveTemplateLanguage(value: unknown): LanguageCode {
  if (typeof value === "string" && (TEMPLATE_LANGUAGES as readonly string[]).includes(value)) {
    return value as LanguageCode;
  }
  return DEFAULT_TEMPLATE_LANGUAGE;
}

/** Built-in body for kind + language (en → pt fallback for langs without a seed). */
export function defaultContentFor(
  kind: TemplateKind,
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
): string {
  const seed = SEEDS.find((item) => item.kind === kind);
  if (!seed) return "";
  return (
    seed.content[language] ??
    seed.content.en ??
    seed.content.pt ??
    ""
  );
}

export function buildDefaultTemplates(
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
): MessageTemplateRecord[] {
  return SEEDS.map((seed) => ({
    id: templateId(seed.kind),
    kind: seed.kind,
    name: seed.name,
    description: seed.description,
    purpose: seed.purpose,
    language,
    content: defaultContentFor(seed.kind, language),
    updatedAt: null,
    isCustom: false,
  }));
}

export function allDefaultTemplates(
  language: LanguageCode = DEFAULT_TEMPLATE_LANGUAGE,
): MessageTemplateRecord[] {
  return buildDefaultTemplates(language);
}

export const TEMPLATE_KIND_ORDER: readonly TemplateKind[] = SEEDS.map((s) => s.kind);
