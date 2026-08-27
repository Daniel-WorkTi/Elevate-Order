import type { OperationalOrder } from "@/lib/order-domain";
import type { OrderEventRow } from "@/lib/synced-orders.functions";

/** Local-only preview of the order detail screen (no Dropi/Shopify required). */
export const ORDER_DETAIL_PREVIEW_ID = "preview";

const PREVIEW_CREATED_AT = "2025-08-23T14:23:00.000Z";

export function getOrderDetailPreview(): OperationalOrder {
  return {
    id: "preview-local",
    order_id: 13707091935609,
    shopify_order_id: 13707091935609,
    status_id: 1,
    status_name: "Confirmado",
    details: "Pedido de teste — pagamento na entrega (COD)",
    tracking_code: "5200000123456N",
    tracking_url: "https://inpost.pl/en/find-parcel?number=5200000123456N",
    shipping_company: "InPost",
    total: 45.49,
    currency: "PLN",
    customer_name: "João da Silva",
    phone: "+48 512 345 678",
    email: "joao.silva@email.com",
    city: "Kraków",
    postal_code: "8000-123",
    address: "Rua das Flores, 123, Centro",
    country: "Polônia",
    source: "Dropi Pro",
    last_event_at: PREVIEW_CREATED_AT,
    created_at: PREVIEW_CREATED_AT,
    product_summary: "Smartwatch Pro X ×1",
    payment_method: "Pagamento na entrega",
    line_items: [
      {
        id: "preview-line-1",
        title: "Smartwatch Pro X",
        variant: "Preto • 44mm",
        imageUrl:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=128&h=128&fit=crop",
        quantity: 1,
        unitPrice: 45.49,
        lineTotal: 45.49,
      },
    ],
  };
}

export function getOrderDetailPreviewEvents(): OrderEventRow[] {
  const t0 = "2025-08-23T10:00:00.000Z";
  const t1 = PREVIEW_CREATED_AT;
  return [
    {
      id: "preview-event-0",
      order_id: 13707091935609,
      event_date: t0,
      status_id: 1,
      status_name: "Pedido no site",
      details: null,
      tracking_code: null,
      tracking_url: null,
      shipping_company: null,
      total: 45.49,
      source: "Shopify",
      created_at: t0,
    },
    {
      id: "preview-event-1",
      order_id: 13707091935609,
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
  ];
}
