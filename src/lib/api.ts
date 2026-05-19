function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (
    !configured ||
    configured.includes("kangaroo-japan-backend-production.up.railway.app")
  ) {
    return "/api/backend";
  }
  return configured;
}

const API_BASE_URL = getApiBaseUrl();

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

interface SupportChatResponse {
  conversationId?: string;
  reply?: string;
  answer?: string;
  message?: string;
}

interface SupportTicketResponse {
  ticketNumber?: string;
  ticket_number?: string;
  number?: string;
  ticket?: {
    ticketNumber?: string;
    ticket_number?: string;
    number?: string;
  };
}

type LegacyProductPlatform = "yahoo" | "mercari" | "rakuten" | "amazon";

const LEGACY_PRODUCT_DETAIL_PATHS: Record<LegacyProductPlatform, string> = {
  yahoo: "/api/legacy/goods/ydetail",
  mercari: "/api/legacy/goods/mdetail",
  rakuten: "/api/legacy/goods/rdetail",
  amazon: "/api/legacy/amazon/detail",
};

export interface SupportOrderLookupItem {
  id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  total: { amount: number; currency?: string | null };
  customer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  shipping: {
    carrier?: string | null;
    trackingNumber?: string | null;
    status?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
    estimatedDelivery?: string | null;
    address?: Record<string, string | null> | null;
  };
  items: Array<{
    id: string;
    platform?: string | null;
    title: string;
    quantity: number;
    status?: string | null;
    trackingNumber?: string | null;
  }>;
  shipmentOrders: Array<{
    id: string;
    status?: string | null;
    shipWay?: string | null;
    weight: number;
    amountRmb: number;
    isPay: boolean;
    receiver: Record<string, string | boolean | null>;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface SupportOrderLookupResponse {
  items: SupportOrderLookupItem[];
  total: number;
  page: number;
  limit: number;
  safety: {
    readonly: boolean;
    masked: boolean;
    externalCarrierLookup: boolean;
    paymentSensitiveFieldsHidden: boolean;
  };
}

export type SupportTicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";
export type SupportTicketCategory =
  | "order"
  | "shipping"
  | "refund"
  | "change_address"
  | "cancel_order"
  | "compensation"
  | "complaint"
  | "general";
export type HermesDraftStatus = "PENDING" | "READY" | "DISMISSED";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string | null;
  site: string;
  language: string;
  category: SupportTicketCategory;
  subject: string;
  description: string;
  conversationSnapshot?: Array<Record<string, unknown>> | null;
  conversationId?: string | null;
  status: SupportTicketStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketListResponse {
  data: SupportTicket[];
  total: number;
}

export interface SupportTicketContextResponse {
  ticket: SupportTicket;
  orders: SupportOrderLookupResponse;
}

export interface HermesDraft {
  id: string;
  ticketId: string;
  jobId: string;
  status: HermesDraftStatus;
  draftBody: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type ExchangeCurrency = "JPY" | "CNY" | "USD";

export interface ExchangeRatesResponse {
  base: "JPY";
  rates: Record<ExchangeCurrency, number>;
  pairs: {
    jpyToCny: number;
    jpyToUsd: number;
    cnyToUsd: number;
  };
  source: "env" | "admin_override";
  lastUpdated: string;
  updatedBy?: string;
}

export interface AdminPlatformHealthItem {
  platform: "yahoo" | "rakuten" | "amazon" | "mercari";
  configured: boolean;
  credentialStatus: "configured" | "missing";
  totalProducts: number;
  lastSync: string | null;
  status: "healthy" | "attention" | "blocked";
  sample: {
    sampleId: string | null;
    sampleKind: string;
    detailPath: string | null;
    imageHosts: string[];
    credentialStatus: "configured" | "missing";
    sampleStatus: "configured" | "missing";
    sampleSource: "env" | "default" | "missing";
    notice: string;
  };
  sampleSmoke: {
    endpoint: string | null;
    status:
      | "passed"
      | "failed"
      | "ready_for_live_check"
      | "blocked_missing_credentials"
      | "blocked_missing_sample";
    detailStatus:
      | "passed"
      | "failed"
      | "blocked"
      | "not_checked"
      | "not_checked_legacy_bridge";
    imageStatus:
      | "passed"
      | "failed"
      | "missing"
      | "blocked"
      | "not_checked"
      | "not_checked_legacy_bridge";
    imageUrl?: string | null;
    error?: string;
    checkedAt: string;
  };
}

export interface AdminOrderItem {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  total_currency: string;
  items_count: number;
  subtotal_jpy: number;
  subtotal_cny: number;
  shipping_fee_jpy: number;
  shipping_fee_cny: number;
  service_fee_jpy: number;
  service_fee_cny: number;
  exchange_rate_used?: number | null;
  exchange_rate_snapshot?: Record<string, unknown> | null;
  payment_method?: string | null;
  paid_at?: string | null;
  tracking_number?: string | null;
  shipping_carrier?: string | null;
  created_at: string;
  updated_at: string;
  items: Array<{
    id: string;
    product_id: string;
    title: string;
    platform: string;
    quantity: number;
    subtotal_jpy: number;
    subtotal_cny: number;
    status: string;
  }>;
  timeline?: Array<{
    key: string;
    label: string;
    at: string | null;
    done: boolean;
  }>;
  payment_link?: {
    payment_id: string;
    payment_method?: string | null;
    paid_at?: string | null;
  } | null;
}

export interface AdminPaymentItem {
  id: string;
  paymentNo: string;
  orderId: string;
  orderNo?: string | null;
  orderLink?: {
    orderId: string;
    orderNo?: string | null;
    adminPath: string;
  };
  userId: string;
  amount: number;
  currency: string;
  method: string;
  provider: string;
  status: string;
  providerPaymentId?: string | null;
  paidAt?: string | null;
  expiredAt?: string | null;
  refundedAt?: string | null;
  refundAmount: number;
  refundReason?: string | null;
  failureMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuditLogItem {
  id: string;
  actorId?: string | null;
  actorEmailHash?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
  ipHash?: string | null;
  userAgentHash?: string | null;
  createdAt: string;
}

export interface AdminListResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  safety?: Record<string, unknown>;
}

export interface AdminPaymentReconciliation {
  total: number;
  byStatus: Record<string, { count: number; amount: number }>;
  byProvider: Record<string, { count: number; amount: number }>;
  stalePending: number;
  refundCandidates: number;
  generatedAt: string;
  safety?: Record<string, unknown>;
}

export interface AdminRefundReviewResponse {
  payment: AdminPaymentItem;
  approval: AdminRefundApprovalItem;
  lifecycleRecorded: boolean;
  auditRecorded: boolean;
  safety: {
    adminOnly: boolean;
    approvalOnly: boolean;
    providerRefundAction: boolean;
    paymentStateChanged: boolean;
  };
}

export interface AdminRefundApprovalItem {
  id: string;
  paymentId: string;
  decision: "needs_review" | "approved_for_manual_refund" | "rejected" | string;
  reason?: string | null;
  actorId?: string | null;
  paymentStatus: string;
  orderId?: string | null;
  provider: string;
  amount: number;
  currency: string;
  providerRefundAction: boolean;
  paymentStateChanged: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminPlatformHealthHistoryItem {
  id: string;
  platform: "yahoo" | "rakuten" | "amazon" | "mercari";
  status: "healthy" | "attention" | "blocked" | string;
  credentialStatus: string;
  sampleStatus: string;
  sampleId?: string | null;
  sampleSmokeStatus: string;
  detailStatus: string;
  imageStatus: string;
  imageUrl?: string | null;
  error?: string | null;
  payload: Record<string, unknown>;
  checkedAt: string;
  createdAt: string;
}

export interface AdminPlatformHealthMigrationStatus {
  tableReady: boolean;
  migrationRecorded: boolean;
  historyRows: number | null;
  checkedAt: string;
  error?: string;
  safety?: Record<string, unknown>;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string | null) => void> = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Request interceptor: read access token from persisted Zustand store
  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("auth-storage");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.state?.accessToken ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private buildConfig(
    method: string,
    body: any,
    headers: Record<string, string>,
    credentials: RequestCredentials,
    token: string | null,
  ): RequestInit {
    const authHeaders: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...headers,
      },
      credentials,
    };
    if (body) config.body = JSON.stringify(body);
    return config;
  }

  private parseResponse<T>(data: unknown): ApiResponse<T> {
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      // Wrapped format: { success: true, data: {...} }
      if ("success" in obj && obj.success === true) {
        return obj as unknown as ApiResponse<T>;
      }
      // NestJS backend format: { code: 0, data: {...} }
      if ("code" in obj && obj.code === 0 && "data" in obj) {
        return { success: true, data: obj.data as T };
      }
      // Direct format: { data: [...], pagination: {...} } (Railway backend)
      if ("data" in obj || "items" in obj) {
        return { success: true, data: obj as T };
      }
    }
    return { success: true, data: data as T };
  }

  private async legacyProductDetailRequest<T>(
    path: string,
    id: string,
    lang: string,
  ): Promise<ApiResponse<T>> {
    const searchParams = new URLSearchParams({
      appid: "kangaroo-japan-web",
      id,
      goodsNo: id,
      goods_no: id,
      lang,
    });

    try {
      const response = await fetch(`${path}?${searchParams.toString()}`, {
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: String(response.status),
            message:
              typeof data?.message === "string"
                ? data.message
                : typeof data?.msg === "string"
                  ? data.msg
                  : response.statusText,
          },
        };
      }

      if (data?.code === 0 && data?.data) {
        return { success: true, data: data.data as T };
      }

      return {
        success: false,
        error: {
          code: String(data?.code ?? "LEGACY_PRODUCT_DETAIL_ERROR"),
          message:
            typeof data?.msg === "string"
              ? data.msg
              : "Legacy product detail request failed",
        },
      };
    } catch (error) {
      console.error("Legacy product detail request failed:", error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Network request failed",
        },
      };
    }
  }

  // Response interceptor: attempt token refresh, then retry or redirect to login
  private async handleUnauthorized(): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshQueue.push(resolve);
      });
    }

    this.isRefreshing = true;
    let newToken: string | null = null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        newToken =
          data?.data?.tokens?.access_token ??
          data?.data?.accessToken ??
          data?.access_token ??
          null;

        if (newToken) {
          const { useAuthStore } = await import("@/lib/auth");
          useAuthStore.getState().setAccessToken(newToken);
        }
      }
    } catch {
      // refresh request failed
    }

    this.isRefreshing = false;
    this.refreshQueue.forEach((resolve) => resolve(newToken));
    this.refreshQueue = [];

    if (!newToken && typeof window !== "undefined") {
      const { useAuthStore } = await import("@/lib/auth");
      useAuthStore.getState().logout();
      const pathParts = window.location.pathname.split("/");
      const lang = ["zh", "en", "ja"].includes(pathParts[1])
        ? pathParts[1]
        : "zh";
      window.location.href = `/${lang}/login`;
    }

    return newToken;
  }

  async request<T>(
    endpoint: string,
    options: ApiOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      method = "GET",
      body,
      headers = {},
      credentials = "include",
    } = options;

    // Request interceptor: attach Authorization header
    const token = this.getAccessToken();
    const config = this.buildConfig(method, body, headers, credentials, token);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Response interceptor: handle 401 Unauthorized
      if (response.status === 401 && !endpoint.startsWith("/auth/")) {
        const newToken = await this.handleUnauthorized();
        if (!newToken) {
          return {
            success: false,
            error: { code: "UNAUTHORIZED", message: "Session expired" },
          };
        }
        // Retry original request with refreshed token
        const retryConfig = this.buildConfig(
          method,
          body,
          headers,
          credentials,
          newToken,
        );
        const retryResponse = await fetch(
          `${this.baseUrl}${endpoint}`,
          retryConfig,
        );
        const retryData = await retryResponse.json();
        if (!retryResponse.ok) {
          return {
            success: false,
            error: {
              code: String(retryResponse.status),
              message:
                typeof retryData?.message === "string"
                  ? retryData.message
                  : typeof retryData?.error?.message === "string"
                    ? retryData.error.message
                    : retryResponse.statusText,
            },
          };
        }
        return this.parseResponse<T>(retryData);
      }

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: {
            code: String(response.status),
            message:
              typeof data?.message === "string"
                ? data.message
                : typeof data?.error?.message === "string"
                  ? data.error.message
                  : response.statusText,
          },
        };
      }
      return this.parseResponse<T>(data);
    } catch (error) {
      console.error("API request failed:", error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Network request failed",
        },
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  }

  async register(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    preferredLanguage?: string;
    preferredCurrency?: string;
  }) {
    return this.request("/auth/register", {
      method: "POST",
      body: data,
    });
  }

  async logout() {
    return this.request("/auth/logout", {
      method: "POST",
    });
  }

  async refresh(refreshToken?: string) {
    return this.request("/auth/refresh", {
      method: "POST",
      body: refreshToken ? { refreshToken } : undefined,
    });
  }

  async forgotPassword(email: string) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  }

  async getProfile() {
    return this.request("/auth/me");
  }

  // Address endpoints
  async getAddresses() {
    return this.request("/addresses");
  }

  async getAddress(id: string) {
    return this.request(`/addresses/${id}`);
  }

  async createAddress(data: any) {
    return this.request("/addresses", {
      method: "POST",
      body: data,
    });
  }

  async updateAddress(id: string, data: any) {
    return this.request(`/addresses/${id}`, {
      method: "PUT",
      body: data,
    });
  }

  async deleteAddress(id: string) {
    return this.request(`/addresses/${id}`, {
      method: "DELETE",
    });
  }

  async setDefaultAddress(id: string) {
    return this.request(`/addresses/${id}/default`, {
      method: "PUT",
    });
  }

  // Product endpoints
  async getProducts(params?: {
    lang?: string;
    page?: number;
    limit?: number;
    platform?: string;
    categoryId?: string;
    priceMin?: number;
    priceMax?: number;
    sort?: string;
    status?: string;
    search?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.lang) searchParams.set("lang", params.lang);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.platform) searchParams.set("platform", params.platform);
    if (params?.categoryId) searchParams.set("categoryId", params.categoryId);
    if (params?.priceMin) searchParams.set("priceMin", String(params.priceMin));
    if (params?.priceMax) searchParams.set("priceMax", String(params.priceMax));
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.request(`/products${query ? `?${query}` : ""}`);
  }

  async getProduct(id: string, lang = "zh") {
    return this.request(`/products/${id}?lang=${lang}`);
  }

  async getLegacyProductDetail(
    id: string,
    lang = "zh",
    platform?: string | null,
  ) {
    const normalizedPlatform = String(platform || "").toLowerCase();
    const preferredPath =
      LEGACY_PRODUCT_DETAIL_PATHS[normalizedPlatform as LegacyProductPlatform];
    const paths = [preferredPath || LEGACY_PRODUCT_DETAIL_PATHS.yahoo];

    let lastError: ApiResponse["error"];
    for (const path of paths) {
      const result = await this.legacyProductDetailRequest(path, id, lang);
      if (result.success) return result;
      lastError = result.error;
    }

    return {
      success: false,
      error: lastError || {
        code: "LEGACY_PRODUCT_DETAIL_ERROR",
        message: "Legacy product detail request failed",
      },
    };
  }

  async searchProducts(q: string, lang = "zh", page = 1, limit = 20) {
    return this.request(
      `/products/search?q=${encodeURIComponent(q)}&lang=${lang}&page=${page}&limit=${limit}`,
    );
  }

  async compareProducts(ids: string[], lang = "zh") {
    return this.request(`/products/compare?ids=${ids.join(",")}&lang=${lang}`);
  }

  async getPriceHistory(productId: string, days = 30, currency = "CNY") {
    return this.request(
      `/products/${productId}/price-history?days=${days}&currency=${currency}`,
    );
  }

  async getCategories(lang = "zh") {
    return this.request(`/categories?lang=${lang}`);
  }

  async getCategory(id: string, lang = "zh") {
    return this.request(`/categories/${id}?lang=${lang}`);
  }

  async getCategoryBySlug(slug: string, lang = "zh") {
    return this.request(`/categories/slug/${slug}?lang=${lang}`);
  }

  async getCategoryProducts(categoryId: string, params?: any) {
    const searchParams = new URLSearchParams();
    if (params?.lang) searchParams.set("lang", params.lang);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sort) searchParams.set("sort", params.sort);

    const query = searchParams.toString();
    return this.request(
      `/categories/${categoryId}/products${query ? `?${query}` : ""}`,
    );
  }

  async getCategoryProductsBySlug(slug: string, params?: any) {
    const searchParams = new URLSearchParams();
    if (params?.lang) searchParams.set("lang", params.lang);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sort) searchParams.set("sort", params.sort);

    const query = searchParams.toString();
    return this.request(
      `/categories/slug/${slug}/products${query ? `?${query}` : ""}`,
    );
  }

  // 统一搜索 - 并行搜索多个平台，返回统一格式
  async unifiedSearch(params: {
    keyword: string;
    page?: number;
    limit?: number;
    platforms?: string;
  }) {
    const searchParams = new URLSearchParams();
    searchParams.set("keyword", params.keyword);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.platforms) searchParams.set("platforms", params.platforms);

    return this.request(
      `/integrations/search/unified?${searchParams.toString()}`,
    );
  }

  // Cart endpoints
  async getCart() {
    return this.request<{
      id: string;
      items: any[];
      summary: {
        totalItems: number;
        subtotalJpy: number;
        subtotalCny: number;
        subtotalUsd: number;
        estimatedShippingJpy: number;
        estimatedShippingCny: number;
        totalJpy: number;
        totalCny: number;
        currency: string;
      };
      groupedBySeller: any[];
    }>("/cart");
  }

  async addCartItem(data: {
    productId: string;
    quantity?: number;
    options?: Record<string, any>;
    buyerMessage?: string;
  }) {
    return this.request("/cart/items", {
      method: "POST",
      body: data,
    });
  }

  async updateCartItem(
    itemId: string,
    data: {
      quantity?: number;
      options?: Record<string, any>;
      buyerMessage?: string;
    },
  ) {
    return this.request(`/cart/items/${itemId}`, {
      method: "PUT",
      body: data,
    });
  }

  async removeCartItem(itemId: string) {
    return this.request(`/cart/items/${itemId}`, {
      method: "DELETE",
    });
  }

  async clearCart() {
    return this.request("/cart/items", {
      method: "DELETE",
    });
  }

  async calculateCart(addressId?: string) {
    return this.request(
      `/cart/calculate${addressId ? `?addressId=${addressId}` : ""}`,
      {
        method: "POST",
      },
    );
  }

  // Order endpoints
  async getOrders(params?: { status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request(`/orders${query ? `?${query}` : ""}`);
  }

  async getOrder(id: string) {
    return this.request(`/orders/${id}`);
  }

  async createOrder(data: {
    addressId: string;
    currency?: string;
    items: { cartItemId?: string; productId?: string; quantity?: number }[];
    buyerMessage?: string;
    couponCode?: string;
  }) {
    return this.request("/orders", {
      method: "POST",
      body: data,
    });
  }

  private async supportRequest<T>(
    endpoint: string,
    body: unknown,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: String(response.status),
            message:
              typeof data?.message === "string"
                ? data.message
                : "Support request failed",
          },
        };
      }

      return this.parseResponse<T>(data);
    } catch (error) {
      console.error("Support API request failed:", error);
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Network request failed",
        },
      };
    }
  }

  async cancelOrder(id: string) {
    return this.request(`/orders/${id}/cancel`, {
      method: "PUT",
    });
  }

  async trackOrder(id: string) {
    return this.request(`/orders/${id}/track`);
  }

  // Support endpoints
  async sendSupportChat(data: {
    message: string;
    conversationId?: string;
    language?: string;
  }) {
    return this.supportRequest<SupportChatResponse>("/api/support/chat", {
      message: data.message,
      conversationId: data.conversationId,
      site: "kangaroo-japan",
      language: data.language || "zh",
    });
  }

  async createSupportTicket(data: {
    name?: string;
    email: string;
    subject: string;
    category: string;
    description: string;
    language?: string;
  }) {
    return this.supportRequest<SupportTicketResponse>("/api/support/tickets", {
      visitorName: data.name || data.email,
      visitorEmail: data.email,
      site: "kangaroo-japan",
      language: data.language || "zh",
      category: data.category || "general",
      subject: data.subject,
      description: data.description,
    });
  }

  async lookupSupportOrders(params: {
    orderNo?: string;
    email?: string;
    phone?: string;
    trackingNumber?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params.orderNo) searchParams.set("orderNo", params.orderNo);
    if (params.email) searchParams.set("email", params.email);
    if (params.phone) searchParams.set("phone", params.phone);
    if (params.trackingNumber)
      searchParams.set("trackingNumber", params.trackingNumber);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<SupportOrderLookupResponse>(
      `/support/orders/lookup${query ? `?${query}` : ""}`,
    );
  }

  async listSupportTickets(params?: {
    site?: string;
    category?: SupportTicketCategory;
    status?: SupportTicketStatus;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.site) searchParams.set("site", params.site);
    if (params?.category) searchParams.set("category", params.category);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<SupportTicketListResponse>(
      `/support/tickets${query ? `?${query}` : ""}`,
    );
  }

  async updateSupportTicketLifecycle(
    ticketId: string,
    data: { status?: SupportTicketStatus; adminNote?: string | null },
  ) {
    return this.request<SupportTicket>(
      `/support/admin/tickets/${ticketId}/lifecycle`,
      {
        method: "POST",
        body: data,
      },
    );
  }

  async getSupportTicketContext(ticketId: string) {
    return this.request<SupportTicketContextResponse>(
      `/support/admin/tickets/${ticketId}/context`,
    );
  }

  async listHermesDraftsForTicket(ticketId: string) {
    return this.request<HermesDraft[]>(
      `/support/admin/tickets/${ticketId}/hermes/drafts`,
    );
  }

  async getAdminPlatformHealth() {
    return this.request<{
      data: AdminPlatformHealthItem[];
      safety: Record<string, unknown>;
    }>("/integrations/admin/health");
  }

  async getAdminPlatformHealthHistory(params?: {
    platform?: "yahoo" | "rakuten" | "amazon" | "mercari";
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.platform) searchParams.set("platform", params.platform);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<{
      data: AdminPlatformHealthHistoryItem[];
      safety: Record<string, unknown>;
    }>(`/integrations/admin/health/history${query ? `?${query}` : ""}`);
  }

  async getAdminPlatformHealthMigrationStatus() {
    return this.request<AdminPlatformHealthMigrationStatus>(
      "/integrations/admin/health/migration-status",
    );
  }

  async runAdminPlatformHealthSmoke() {
    return this.request<{
      data: AdminPlatformHealthItem[];
      persistence: AdminPlatformHealthMigrationStatus;
      safety: Record<string, unknown>;
    }>("/integrations/admin/health/smoke", {
      method: "POST",
    });
  }

  async retryPlatformSync(data: {
    platform: "yahoo" | "rakuten" | "amazon" | "mercari";
    keyword: string;
  }) {
    return this.request<{
      result: {
        platform: string;
        keyword: string;
        found: number;
        synced: number;
        success: boolean;
        error?: string;
      };
      safety: Record<string, unknown>;
    }>("/integrations/admin/sync/retry", {
      method: "POST",
      body: data,
    });
  }

  async listAdminOrders(params?: {
    status?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminOrderItem>>(
      `/orders/admin${query ? `?${query}` : ""}`,
    );
  }

  async listAdminPayments(params?: {
    status?: string;
    provider?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.provider) searchParams.set("provider", params.provider);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminPaymentItem>>(
      `/payments/admin${query ? `?${query}` : ""}`,
    );
  }

  async getAdminPaymentReconciliation() {
    return this.request<AdminPaymentReconciliation>(
      "/payments/admin/reconciliation",
    );
  }

  async listAdminRefundApprovals(params?: {
    paymentId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.paymentId) searchParams.set("paymentId", params.paymentId);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminRefundApprovalItem>>(
      `/payments/admin/refund-approvals${query ? `?${query}` : ""}`,
    );
  }

  async recordAdminRefundReview(
    paymentId: string,
    data: {
      decision: "needs_review" | "approved_for_manual_refund" | "rejected";
      reason?: string | null;
    },
  ) {
    return this.request<AdminRefundReviewResponse>(
      `/payments/admin/${paymentId}/refund-review`,
      {
        method: "POST",
        body: data,
      },
    );
  }

  async listAdminAuditLogs(params?: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    actorId?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.action) searchParams.set("action", params.action);
    if (params?.resourceType)
      searchParams.set("resourceType", params.resourceType);
    if (params?.resourceId) searchParams.set("resourceId", params.resourceId);
    if (params?.actorId) searchParams.set("actorId", params.actorId);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString();
    return this.request<AdminListResponse<AdminAuditLogItem>>(
      `/admin/audit-logs${query ? `?${query}` : ""}`,
    );
  }

  async triggerHermesDraft(data: { ticketId: string; promptContext?: string }) {
    return this.request<{ jobId: string }>("/support/admin/hermes/jobs", {
      method: "POST",
      body: data,
    });
  }

  async getHermesDraft(jobId: string) {
    return this.request<HermesDraft>(`/support/admin/hermes/drafts/${jobId}`);
  }

  async dismissHermesDraft(jobId: string, reason?: string) {
    return this.request<HermesDraft>(
      `/support/admin/hermes/drafts/${jobId}/dismiss`,
      {
        method: "POST",
        body: { reason },
      },
    );
  }

  // Exchange rate admin endpoints
  async getExchangeRates() {
    return this.request<ExchangeRatesResponse>("/exchange-rates");
  }

  async updateExchangeRates(data: {
    jpyToCny?: number;
    jpyToUsd?: number;
    cnyToUsd?: number;
  }) {
    return this.request<ExchangeRatesResponse>("/exchange-rates/admin", {
      method: "PATCH",
      body: data,
    });
  }

  // Payment endpoints
  async createPaymentIntent(data: {
    orderId: string;
    method?: "stripe" | "alipay" | "wechat_pay";
    paymentMethodTypes?: string[];
    currency?: "CNY" | "USD" | "JPY";
  }) {
    return this.request("/payments/create-intent", {
      method: "POST",
      body: data,
    });
  }

  async confirmPayment(paymentId: string, paymentMethodId?: string) {
    return this.request(`/payments/${paymentId}/confirm`, {
      method: "POST",
      body: { payment_method_id: paymentMethodId },
    });
  }

  async cancelPayment(paymentId: string) {
    return this.request(`/payments/${paymentId}/cancel`, {
      method: "POST",
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.request(`/payments/${paymentId}`);
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    return this.request(`/payments/${paymentId}/refund`, {
      method: "POST",
      body: { amount, reason },
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export type { ApiResponse };
