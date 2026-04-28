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
  private isRefreshing = false;
  private refreshQueue: Array<(token: string | null) => void> = [];

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Request interceptor: read access token from persisted Zustand store
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.state?.accessToken ?? null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private buildConfig(method: string, body: any, headers: Record<string, string>, credentials: RequestCredentials, token: string | null): RequestInit {
    const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...headers,
      },
      credentials,
    };
    if (body) config.body = JSON.stringify(body);
    return config;
  }

  private parseResponse<T>(data: unknown): ApiResponse<T> {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      // Wrapped format: { success: true, data: {...} }
      if ('success' in obj && obj.success === true) {
        return obj as unknown as ApiResponse<T>;
      }
      // Direct format: { data: [...], pagination: {...} } (Railway backend)
      if ('data' in obj || 'items' in obj) {
        return { success: true, data: obj as T };
      }
    }
    return { success: true, data: data as T };
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        newToken =
          data?.data?.tokens?.access_token ??
          data?.data?.accessToken ??
          data?.access_token ??
          null;

        if (newToken) {
          const { useAuthStore } = await import('@/lib/auth');
          useAuthStore.getState().setAccessToken(newToken);
        }
      }
    } catch {
      // refresh request failed
    }

    this.isRefreshing = false;
    this.refreshQueue.forEach((resolve) => resolve(newToken));
    this.refreshQueue = [];

    if (!newToken && typeof window !== 'undefined') {
      const { useAuthStore } = await import('@/lib/auth');
      useAuthStore.getState().logout();
      const pathParts = window.location.pathname.split('/');
      const lang = ['zh', 'en', 'ja'].includes(pathParts[1]) ? pathParts[1] : 'zh';
      window.location.href = `/${lang}/login`;
    }

    return newToken;
  }

  async request<T>(
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const { method = "GET", body, headers = {}, credentials = "include" } = options;

    // Request interceptor: attach Authorization header
    const token = this.getAccessToken();
    const config = this.buildConfig(method, body, headers, credentials, token);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);

      // Response interceptor: handle 401 Unauthorized
      if (response.status === 401 && !endpoint.startsWith('/auth/')) {
        const newToken = await this.handleUnauthorized();
        if (!newToken) {
          return {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Session expired' },
          };
        }
        // Retry original request with refreshed token
        const retryConfig = this.buildConfig(method, body, headers, credentials, newToken);
        const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, retryConfig);
        const retryData = await retryResponse.json();
        return this.parseResponse<T>(retryData);
      }

      const data = await response.json();
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
    return this.request(`/categories/${categoryId}/products${query ? `?${query}` : ""}`);
  }

  async getCategoryProductsBySlug(slug: string, params?: any) {
    const searchParams = new URLSearchParams();
    if (params?.lang) searchParams.set("lang", params.lang);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.sort) searchParams.set("sort", params.sort);

    const query = searchParams.toString();
    return this.request(`/categories/slug/${slug}/products${query ? `?${query}` : ""}`);
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
