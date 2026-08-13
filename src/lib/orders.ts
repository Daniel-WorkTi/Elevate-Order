export type OrderStatus = "confirmed" | "messaged" | "unanswered" | "incident";

export type Order = {
  id: string;
  customer: string;
  phone: string;
  postalCode: string;
  city: string;
  status: OrderStatus;
  date: string;
  total: number;
  product: string;
  source: "Dropi Pro" | "Dropea";
  lastSync: string;
  note?: string;
  /** Motivo da incidência, ex.: "Pacote recusado" */
  reason?: string;
};

export const statusMeta: Record<
  OrderStatus,
  { label: string; dot: string; chip: string; ring: string }
> = {
  confirmed: {
    label: "Confirmed",
    dot: "bg-success",
    chip: "bg-success/12 text-success border-success/25",
    ring: "ring-success/30",
  },
  messaged: {
    label: "Messaged",
    dot: "bg-info",
    chip: "bg-info/12 text-info border-info/25",
    ring: "ring-info/30",
  },
  unanswered: {
    label: "Unanswered",
    dot: "bg-neutral",
    chip: "bg-neutral/15 text-muted-foreground border-neutral/30",
    ring: "ring-neutral/30",
  },
  incident: {
    label: "Incident",
    dot: "bg-danger",
    chip: "bg-danger/12 text-danger border-danger/25",
    ring: "ring-danger/30",
  },
};

export const orders: Order[] = [
  {
    id: "ELV-10241",
    customer: "María Fernández",
    phone: "+34611223344",
    postalCode: "28015",
    city: "Madrid",
    status: "confirmed",
    date: "2026-08-10T09:12:00Z",
    total: 49.9,
    product: "Posture Corrector Pro",
    source: "Dropi Pro",
    lastSync: "2 min ago",
  },
  {
    id: "ELV-10240",
    customer: "Andrés Ocampo",
    phone: "+573015558822",
    postalCode: "110111",
    city: "Bogotá",
    status: "incident",
    date: "2026-08-10T08:40:00Z",
    total: 32.5,
    product: "Smart LED Strip 5m",
    source: "Dropea",
    lastSync: "4 min ago",
    reason: "Endereço incorreto",
    note: "Carrier reported wrong address on second delivery attempt.",
  },
  {
    id: "ELV-10238",
    customer: "Lucía Ramírez",
    phone: "+34622114455",
    postalCode: "08028",
    city: "Barcelona",
    status: "messaged",
    date: "2026-08-09T17:05:00Z",
    total: 74.0,
    product: "Cordless Massage Gun",
    source: "Dropi Pro",
    lastSync: "6 min ago",
  },
  {
    id: "ELV-10236",
    customer: "Tomás Herrera",
    phone: "+525533221199",
    postalCode: "03100",
    city: "Ciudad de México",
    status: "unanswered",
    date: "2026-08-09T12:22:00Z",
    total: 21.9,
    product: "Kitchen Vacuum Sealer",
    source: "Dropea",
    lastSync: "9 min ago",
  },
  {
    id: "ELV-10233",
    customer: "Paula Nogueira",
    phone: "+351912334455",
    postalCode: "1250-096",
    city: "Lisboa",
    status: "confirmed",
    date: "2026-08-09T10:02:00Z",
    total: 58.4,
    product: "Portable Blender X2",
    source: "Dropi Pro",
    lastSync: "11 min ago",
  },
  {
    id: "ELV-10230",
    customer: "Diego Salas",
    phone: "+56988776655",
    postalCode: "7500000",
    city: "Santiago",
    status: "incident",
    date: "2026-08-08T19:47:00Z",
    total: 96.2,
    product: "Dashboard Cam 4K",
    source: "Dropea",
    lastSync: "14 min ago",
    reason: "Reagendamento pedido",
    note: "Customer requested delivery reschedule for next week.",
  },
  {
    id: "ELV-10229",
    customer: "Sofía Bianchi",
    phone: "+393334455667",
    postalCode: "20121",
    city: "Milano",
    status: "messaged",
    date: "2026-08-08T15:31:00Z",
    total: 39.9,
    product: "Ergonomic Laptop Stand",
    source: "Dropi Pro",
    lastSync: "18 min ago",
  },
  {
    id: "ELV-10226",
    customer: "Javier Ruiz",
    phone: "+34644778899",
    postalCode: "41004",
    city: "Sevilla",
    status: "unanswered",
    date: "2026-08-08T11:14:00Z",
    total: 27.3,
    product: "Pet Hair Remover",
    source: "Dropea",
    lastSync: "22 min ago",
  },
  {
    id: "ELV-10222",
    customer: "Camila Duarte",
    phone: "+5511998877665",
    postalCode: "01310-100",
    city: "São Paulo",
    status: "confirmed",
    date: "2026-08-07T16:58:00Z",
    total: 64.8,
    product: "Wireless Earbuds Air",
    source: "Dropi Pro",
    lastSync: "25 min ago",
  },
  {
    id: "ELV-10219",
    customer: "Nicolás Vega",
    phone: "+5491133445566",
    postalCode: "C1425",
    city: "Buenos Aires",
    status: "incident",
    date: "2026-08-07T09:24:00Z",
    total: 45.0,
    product: "Mini Projector Lumo",
    source: "Dropea",
    lastSync: "31 min ago",
    reason: "Pacote recusado",
    note: "Package returned to warehouse — awaiting customer confirmation.",
  },
  {
    id: "ELV-10215",
    customer: "Elena Cortés",
    phone: "+34655443322",
    postalCode: "46002",
    city: "Valencia",
    status: "messaged",
    date: "2026-08-06T18:11:00Z",
    total: 88.9,
    product: "Air Fryer Compact",
    source: "Dropi Pro",
    lastSync: "38 min ago",
  },
  {
    id: "ELV-10211",
    customer: "Bruno Castillo",
    phone: "+51987654321",
    postalCode: "15074",
    city: "Lima",
    status: "unanswered",
    date: "2026-08-06T08:36:00Z",
    total: 19.5,
    product: "Magnetic Phone Mount",
    source: "Dropea",
    lastSync: "42 min ago",
  },
];

export function formatOrderDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function statusLabel(order: Order) {
  if (order.status === "incident") return order.reason ?? "Incidência";
  return statusMeta[order.status].label;
}

export function suggestedMessage(order: Order) {
  const name = order.customer.split(" ")[0];
  const head = `Olá ${name}! 👋 Aqui é o suporte ELEVATE sobre o seu pedido ${order.id} (${order.product}).`;
  const foot = "Obrigado pela atenção! 🙏";

  const body = (() => {
    if (order.status === "incident") {
      switch (order.reason) {
        case "Pacote recusado":
          return `Consta que o pacote foi recusado na entrega em ${order.postalCode} ${order.city}. Deseja que façamos uma nova tentativa de entrega? Se sim, confirme o endereço e o melhor horário.`;
        case "Endereço incorreto":
          return `A transportadora não conseguiu entregar em ${order.postalCode} ${order.city} porque o endereço parece incorreto. Pode nos confirmar o endereço completo (rua, número e complemento)?`;
        case "Reagendamento pedido":
          return `Recebemos o pedido de reagendamento da entrega em ${order.postalCode} ${order.city}. Qual dia e horário funcionam melhor para você receber o pacote?`;
        default:
          return `Identificamos uma incidência na entrega em ${order.postalCode} ${order.city}. Pode confirmar o endereço e um bom horário para receber o pacote?`;
      }
    }
    if (order.status === "unanswered")
      return `Ainda não recebemos sua confirmação para o envio até ${order.postalCode} ${order.city}. Podemos seguir com a entrega?`;
    if (order.status === "messaged")
      return `Passando para saber se ficou alguma dúvida sobre o seu pedido. A entrega em ${order.postalCode} ${order.city} segue programada.`;
    return `Seu pedido está confirmado e a caminho de ${order.postalCode} ${order.city}. Avisaremos assim que sair para entrega.`;
  })();

  return `${head}\n\n${body}\n\n${foot}`;
}

export function whatsappLink(order: Order, message = suggestedMessage(order)) {
  return `https://wa.me/${order.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
}
