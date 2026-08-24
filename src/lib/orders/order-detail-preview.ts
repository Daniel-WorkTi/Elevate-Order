import type { OperationalOrder } from "@/lib/order-domain";
import type { OrderEventRow } from "@/lib/synced-orders.functions";

/** Local-only preview of the order detail screen (no Dropi/Shopify required). */
export const ORDER_DETAIL_PREVIEW_ID = "preview";

export function getOrderDetailPreview(): OperationalOrder {
  const now = new Date().toISOString();
  return {
    id: "preview-local",
    order_id: 908285,
    shopify_order_id: 13707091935609,
    status_id: 1,
    status_name: "Confirmed",
    details: "Pedido de teste — contra entrega (pré-visualização local)",
    tracking_code: null,
    tracking_url: null,
    shipping_company: null,
    total: 45.49,
    currency: "PLN",
    customer_name: "João da Silva",
    phone: "+48512345678",
    email: "joao.silva@email.com",
    city: "Kraków",
    postal_code: "8000-123",
    address: "Rua das Flores, 123, Centro",
    country: "Polônia",
    source: "Dropi Pro",
    last_event_at: now,
    created_at: now,
    product_summary: "Smartwatch Pro X ×1",
    payment_method: "Pagamento na entrega",
    line_items: [
      {
        id: "preview-line-1",
        title: "Smartwatch Pro X",
        variant: "Preto • 44mm",
        imageUrl: null,
        quantity: 1,
        unitPrice: 45.49,
        lineTotal: 45.49,
      },
    ],
  };
}

export function getOrderDetailPreviewEvents(): OrderEventRow[] {
  const now = new Date();
  const t1 = new Date(now.getTime() - 40 * 60 * 1000).toISOString();
  const t2 = new Date(now.getTime() - 25 * 60 * 1000).toISOString();
  const t3 = now.toISOString();
  return [
    {
      id: "preview-event-1",
      order_id: 908285,
      event_date: t1,
      status_id: 1,
      status_name: "Confirmado",
      details: null,
      tracking_code: null,
      tracking_url: null,
      shipping_company: null,
      total: 45.49,
      source: "Dropi Pro",
      created_at: t1,
    },
    {
      id: "preview-event-2",
      order_id: 908285,
      event_date: t2,
      status_id: 1,
      status_name: "Pagamento aprovado",
      details: "Contra entrega",
      tracking_code: null,
      tracking_url: null,
      shipping_company: null,
      total: 45.49,
      source: "Dropi Pro",
      created_at: t2,
    },
    {
      id: "preview-event-3",
      order_id: 908285,
      event_date: t3,
      status_id: 1,
      status_name: "Aguardando envio",
      details: null,
      tracking_code: null,
      tracking_url: null,
      shipping_company: null,
      total: 45.49,
      source: "Dropi Pro",
      created_at: t3,
    },
  ];
}
