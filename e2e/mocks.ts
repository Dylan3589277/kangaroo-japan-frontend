import type { Page, Route } from "@playwright/test";

const product = {
  id: "e2e-product-1",
  platform: "amazon",
  platformName: "Amazon",
  title: "E2E Mock Camera",
  priceJpy: 12800,
  priceCny: 640,
  priceUsd: 88.5,
  currency: "JPY",
  images: [],
  imagesCount: 0,
  rating: 4.8,
  reviewCount: 12,
  salesCount: 3,
  inStock: true,
  status: "active",
};

const categories = [
  {
    id: "cat-camera",
    name: "相机",
    nameZh: "相机",
    nameEn: "Camera",
    nameJa: "カメラ",
    slug: "camera",
  },
];

export const emptyCart = {
  id: "cart-empty",
  items: [],
  summary: {
    totalItems: 0,
    subtotalJpy: 0,
    subtotalCny: 0,
    subtotalUsd: 0,
    estimatedShippingJpy: 0,
    estimatedShippingCny: 0,
    totalJpy: 0,
    totalCny: 0,
    currency: "CNY",
  },
  groupedBySeller: [],
};

const cartItem = {
  id: "cart-item-1",
  product: {
    id: product.id,
    title: product.title,
    coverImage: null,
    platform: product.platform,
    priceJpy: product.priceJpy,
    priceCny: product.priceCny,
  },
  quantity: 1,
  unitPriceJpy: product.priceJpy,
  unitPriceCny: product.priceCny,
  subtotalJpy: product.priceJpy,
  subtotalCny: product.priceCny,
  options: {},
  seller: { id: "seller-1", name: "E2E Seller" },
};

export const cartWithItem = {
  id: "cart-e2e",
  items: [cartItem],
  summary: {
    totalItems: 1,
    subtotalJpy: product.priceJpy,
    subtotalCny: product.priceCny,
    subtotalUsd: product.priceUsd,
    estimatedShippingJpy: 1200,
    estimatedShippingCny: 60,
    totalJpy: 14000,
    totalCny: 700,
    currency: "CNY",
  },
  groupedBySeller: [
    {
      seller: { id: "seller-1", name: "E2E Seller" },
      items: [cartItem],
      subtotal: product.priceJpy,
    },
  ],
};

const addresses = [
  {
    id: "addr-1",
    recipient_name: "E2E User",
    phone: "09000000000",
    country: "CN",
    country_name: "中国",
    address_line1: "E2E Street 1",
    city: "Shanghai",
    postal_code: "200000",
    label: "Home",
    is_default: true,
  },
];

const supportTicket = {
  id: "ticket-e2e",
  ticketNumber: "SUP-E2E-0001",
  visitorName: "E2E Customer",
  visitorEmail: "e***@example.com",
  visitorPhone: null,
  site: "kangaroo-japan",
  language: "zh",
  category: "shipping",
  subject: "请确认订单物流",
  description: "客户询问 DSJ-E2E-0001 的物流进度。",
  conversationSnapshot: null,
  conversationId: "conversation-e2e",
  status: "open",
  handlingStatus: "unhandled",
  adminNote: null,
  assignedAdminId: null,
  assignedAdminEmailHash: null,
  slaDueAt: null,
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:05:00.000Z",
};

const supportOrder = {
  id: "order-e2e",
  orderNo: "DSJ-E2E-0001",
  status: "paid",
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:05:00.000Z",
  paidAt: "2026-05-10T10:03:00.000Z",
  total: { amount: 12800, currency: "JPY" },
  adminLinks: {
    orderAdminPath: "/admin/orders/order-e2e",
    paymentAdminPath: "/admin/payments/payment-e2e",
    auditLookupPath: "/admin/audit-logs?resourceId=order-e2e",
  },
  customer: { name: "E***", email: "e***@example.com", phone: "090***00" },
  shipping: {
    carrier: "Yamato",
    trackingNumber: "YA***0001",
    status: "paid",
    address: { country: "CN", city: "Shanghai" },
  },
  items: [
    { id: "item-e2e", title: "E2E Mock Camera", quantity: 1, status: "paid" },
  ],
  shipmentOrders: [
    {
      id: "shipment-e2e",
      status: "pending",
      shipWay: "EMS",
      weight: 1.2,
      amountRmb: 60,
      isPay: false,
      receiver: {
        name: "E***",
        mobile: "090***00",
        country: "CN",
        city: "Shanghai",
      },
      createdAt: "2026-05-10T10:10:00.000Z",
      updatedAt: "2026-05-10T10:10:00.000Z",
    },
  ],
};

const hermesDraft = {
  id: "draft-e2e",
  ticketId: supportTicket.id,
  jobId: "job-e2e",
  status: "READY",
  draftBody:
    "您好，基于当前订单上下文，DSJ-E2E-0001 已付款，物流信息请以后续仓库更新为准。超出订单上下文的问题将转人工确认。",
  metadata: {
    sourceIds: ["kb-shipping"],
    orderContextUsed: true,
    knowledgeOnly: true,
    customerScopeOnly: true,
    reviewedBeforeSend: true,
    policy: {
      knowledgeOnly: true,
      customerScopeOnly: true,
      noAutoSendToCustomer: true,
    },
  },
  createdAt: "2026-05-10T10:06:00.000Z",
  updatedAt: "2026-05-10T10:06:00.000Z",
};

/**
 * Register a route handler for both old /api/v1/ and new /api/backend/ path patterns.
 * This ensures mocks work regardless of which backend URL the app rewrites to.
 *
 * Usage example: mockApi(page, '/cart', (route) => json(route, { data: ... }))
 */
export async function mockApi(
  page: Page,
  pathSuffix: string,
  handler: RouteHandlerCallback,
) {
  await page.route(`**/api/v1${pathSuffix}`, handler);
  await page.route(`**/api/backend${pathSuffix}`, handler);
  await page.route(`**/__e2e-api${pathSuffix}`, handler);
}

type RouteHandlerCallback = (route: Route) => void | Promise<void>;

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockBackend(
  page: Page,
  options: { cart?: typeof emptyCart | typeof cartWithItem } = {},
) {
  const cart = options.cart ?? emptyCart;

  await page.route("https://embed.tawk.to/**", (route) => route.abort());
  await page.route("**/api/support/**", (route) => handleApiRoute(route, cart));
  await page.route("**/__e2e-api/**", (route) => handleApiRoute(route, cart));
  await page.route("**/api/backend/**", (route) => handleApiRoute(route, cart));
  await page.route("**/kangaroo-japan-backend.vercel.app/api/v1/**", (route) =>
    handleApiRoute(route, cart),
  );
}

export async function signInForE2E(
  page: Page,
  role: "user" | "admin" = "user",
) {
  await page.addInitScript((e2eRole) => {
    window.localStorage.setItem(
      "auth-storage",
      JSON.stringify({
        state: {
          user: {
            id: "user-e2e",
            email: "e2e@example.com",
            name: "E2E User",
            role: e2eRole,
            preferredLanguage: "zh",
            preferredCurrency: "CNY",
          },
          accessToken: "e2e-token",
          isAuthenticated: true,
        },
        version: 0,
      }),
    );
  }, role);
}

function handleApiRoute(
  route: Route,
  cart: typeof emptyCart | typeof cartWithItem,
) {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname
    .replace(/^\/__e2e-api/, "")
    .replace(/^\/api\/v1/, "")
    .replace(/^\/api\/backend/, "")
    .replace(/^\/api/, "");

  if (path === "/categories") {
    return json(route, { success: true, data: categories });
  }

  if (path === "/products" || path === "/products/search") {
    return json(route, {
      success: true,
      data: {
        data: [product],
        pagination: {
          page: Number(url.searchParams.get("page") || 1),
          limit: Number(url.searchParams.get("limit") || 20),
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      },
    });
  }

  if (path === "/cart") {
    return json(route, { success: true, data: cart });
  }

  if (path === "/addresses") {
    return json(route, { success: true, data: addresses });
  }

  if (path === "/orders" && request.method() === "POST") {
    return json(route, { success: true, data: { order_id: "order-e2e" } });
  }

  if (path === "/auth/login") {
    return json(
      route,
      { success: false, error: { message: "E2E login is mocked" } },
      401,
    );
  }

  if (path === "/support/chat") {
    return json(route, {
      success: true,
      data: { conversationId: "conversation-e2e", reply: "E2E support reply" },
    });
  }

  if (path === "/support/tickets" && request.method() === "POST") {
    return json(route, { success: true, data: { ticketNumber: "T-E2E-1" } });
  }

  if (path === "/support/tickets" && request.method() === "GET") {
    return json(route, {
      success: true,
      data: {
        data: [supportTicket],
        total: 1,
      },
    });
  }

  if (path === `/support/admin/tickets/${supportTicket.id}/context`) {
    return json(route, {
      success: true,
      data: {
        ticket: supportTicket,
        orders: {
          items: [supportOrder],
          total: 1,
          page: 1,
          limit: 10,
          safety: {
            readonly: true,
            masked: true,
            externalCarrierLookup: false,
            paymentSensitiveFieldsHidden: true,
          },
        },
      },
    });
  }

  if (path === `/support/admin/tickets/${supportTicket.id}/hermes/drafts`) {
    return json(route, { success: true, data: [hermesDraft] });
  }

  if (path === "/support/admin/hermes/jobs") {
    return json(route, { success: true, data: { jobId: hermesDraft.jobId } });
  }

  if (path === `/support/admin/hermes/drafts/${hermesDraft.jobId}`) {
    return json(route, { success: true, data: hermesDraft });
  }

  if (path === `/support/admin/hermes/drafts/${hermesDraft.jobId}/send`) {
    return json(route, {
      success: true,
      data: {
        draft: {
          ...hermesDraft,
          status: "SENT",
          sentAt: "2026-05-10T10:08:00.000Z",
          sentByAdminId: "admin-e2e",
          sentMessageId: "message-e2e",
        },
        ticket: { ...supportTicket, status: "in_progress" },
        message: {
          id: "message-e2e",
          conversationId: "conversation-e2e",
          createdAt: "2026-05-10T10:08:00.000Z",
        },
        auditRecorded: true,
        safety: {
          reviewedBeforeSend: true,
          knowledgeOnly: true,
          customerScopeOnly: true,
          externalTransport: true,
        },
      },
    });
  }

  if (path === "/support/orders/lookup") {
    return json(route, {
      success: true,
      data: {
        items: [
          {
            id: "order-e2e",
            orderNo: "DSJ-E2E-0001",
            status: "paid",
            createdAt: "2026-05-10T10:00:00.000Z",
            updatedAt: "2026-05-10T10:05:00.000Z",
            paidAt: "2026-05-10T10:03:00.000Z",
            total: { amount: 12800, currency: "JPY" },
            customer: {
              name: "E***",
              email: "e***@example.com",
              phone: "090***00",
            },
            shipping: {
              carrier: "Yamato",
              trackingNumber: "YA***0001",
              status: "paid",
              address: { country: "CN", city: "Shanghai" },
            },
            items: [
              {
                id: "item-e2e",
                title: "E2E Mock Camera",
                quantity: 1,
                status: "paid",
              },
            ],
            shipmentOrders: [
              {
                id: "shipment-e2e",
                status: "pending",
                shipWay: "EMS",
                weight: 1.2,
                amountRmb: 60,
                isPay: false,
                receiver: {
                  name: "E***",
                  mobile: "090***00",
                  country: "CN",
                  city: "Shanghai",
                },
                createdAt: "2026-05-10T10:10:00.000Z",
                updatedAt: "2026-05-10T10:10:00.000Z",
              },
            ],
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        safety: {
          readonly: true,
          masked: true,
          externalCarrierLookup: false,
          paymentSensitiveFieldsHidden: true,
        },
      },
    });
  }

  return json(route, { success: true, data: null });
}
