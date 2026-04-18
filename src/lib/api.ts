const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const { method = "GET", body, headers = {}, credentials = "include" } = options;

    // Get token from auth store if available (browser only)
    let authHeaders: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      try {
        const { useAuthStore } = await import('@/lib/auth');
        const token = useAuthStore.getState().accessToken;
        if (token) {
          authHeaders = { Authorization: `Bearer ${token}` };
        }
      } catch {
        // Auth store not available
      }
    }

    const config: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...headers,
      },
      credentials,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();
      
      // Handle both response formats:
      // 1. { success: true, data: {...} } - wrapped format
      // 2. { data: [...], pagination: {...} } - direct format (Railway backend)
      if (typeof data === 'object' && data !== null) {
        if ('success' in data && data.success === true) {
          return data as ApiResponse<T>;
        }
        if ('data' in data || 'items' in data) {
          return { success: true, data } as ApiResponse<T>;
        }
      }
      
      return { success: true, data } as ApiResponse<T>;
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

    const query = searchParams.toString();
    return this.request(`/products${query ? `?${query}` : ""}`);
  }

  async getProduct(id: string, lang = "zh") {
    return this.request(`/products/${id}?lang=${lang}`);
  }

  async searchProducts(q: string, lang = "zh", page = 1, limit = 20) {
    return this.request(`/products/search?q=${encodeURIComponent(q)}&lang=${lang}&page=${page}&limit=${limit}`);
  }

  async compareProducts(ids: string[], lang = "zh") {
    return this.request(`/products/compare?ids=${ids.join(",")}&lang=${lang}`);
  }

  async getPriceHistory(productId: string, days = 30, currency = "CNY") {
    return this.request(`/products/${productId}/price-history?days=${days}&currency=${currency}`);
  }

  async getCategories(lang = "zh") {
    return this.request(`/categories?lang=${lang}`);
  }

  async getCategory(id: string, lang = "zh") {
    return this.request(`/categories/${id}?lang=${lang}`);
  }

  async getCategoryProducts(categoryId: string, params?: any) {
    const searchParams = new URLSearchParams();
    if (params?.lang) searchParams.set("lang", params.lang);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sort) searchParams.set("sort", params.sort);

    const query = searchParams.toString();
    return this.request(`/categories/${categoryId}/products${query ? `?${query}` : ""}`);
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

    return this.request(`/integrations/search/unified?${searchParams.toString()}`);
  }

  // Cart endpoints
  async getCart() {
    return this.request<
      {
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
      }
    >("/cart");
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
    data: { quantity?: number; options?: Record<string, any>; buyerMessage?: string },
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
    return this.request(`/cart/calculate${addressId ? `?addressId=${addressId}` : ""}`, {
      method: "POST",
    });
  }

  // Order endpoints
  async getOrders(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
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
    return this.request('/orders', {
      method: 'POST',
      body: data,
    });
  }

  async cancelOrder(id: string) {
    return this.request(`/orders/${id}/cancel`, {
      method: 'PUT',
    });
  }

  async trackOrder(id: string) {
    return this.request(`/orders/${id}/track`);
  }

  // Payment endpoints
  async createPaymentIntent(data: {
    orderId: string;
    method?: 'stripe' | 'alipay' | 'wechat_pay';
    paymentMethodTypes?: string[];
    currency?: 'CNY' | 'USD' | 'JPY';
  }) {
    return this.request('/payments/create-intent', {
      method: 'POST',
      body: data,
    });
  }

  async confirmPayment(paymentId: string, paymentMethodId?: string) {
    return this.request(`/payments/${paymentId}/confirm`, {
      method: 'POST',
      body: { payment_method_id: paymentMethodId },
    });
  }

  async cancelPayment(paymentId: string) {
    return this.request(`/payments/${paymentId}/cancel`, {
      method: 'POST',
    });
  }

  async getPaymentStatus(paymentId: string) {
    return this.request(`/payments/${paymentId}`);
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    return this.request(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: { amount, reason },
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export type { ApiResponse };
