"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_id: string;
  title: string;
  cover_image: string | null;
  platform: string;
  quantity: number;
  unit_price_jpy: number;
  unit_price_cny: number;
  subtotal_jpy: number;
  subtotal_cny: number;
  status: string;
  tracking_number: string | null;
}

interface Order {
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
  payment_method: string | null;
  paid_at: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  items: OrderItem[];
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  paid: "bg-blue-500",
  processing: "bg-purple-500",
  purchased: "bg-indigo-500",
  shipped: "bg-orange-500",
  in_transit: "bg-cyan-500",
  delivered: "bg-green-500",
  cancelled: "bg-gray-500",
  refunded: "bg-pink-500",
};

const STATUS_LABELS: Record<string, { zh: string; en: string; ja: string }> = {
  pending: { zh: "待支付", en: "Pending", ja: "未払い" },
  paid: { zh: "已支付", en: "Paid", ja: "支払済み" },
  processing: { zh: "处理中", en: "Processing", ja: "処理中" },
  purchased: { zh: "已代购", en: "Purchased", ja: "購入済み" },
  shipped: { zh: "已发货", en: "Shipped", ja: "発送済み" },
  in_transit: { zh: "运输中", en: "In Transit", ja: "輸送中" },
  delivered: { zh: "已送达", en: "Delivered", ja: "配達完了" },
  cancelled: { zh: "已取消", en: "Cancelled", ja: "キャンセル" },
  refunded: { zh: "已退款", en: "Refunded", ja: "返金済み" },
};

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

const PLATFORM_NAMES: Record<string, string> = {
  amazon: "Amazon",
  mercari: "Mercari",
  rakuten: "Rakuten",
  yahoo: "Yahoo",
};

function formatCurrency(amount: number, currency: string = "CNY"): string {
  if (currency === "JPY") return `¥${Math.round(amount).toLocaleString()}`;
  if (currency === "USD") return `$${amount.toFixed(2)}`;
  return `¥${amount.toFixed(2)}`;
}

function getStatusLabel(status: string, lang: string): string {
  const labels = STATUS_LABELS[status] || { zh: status, en: status, ja: status };
  return labels[lang as keyof typeof labels] || labels.zh;
}

export default function OrdersPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const query: { page?: number; limit?: number; status?: string } = {
        page,
        limit: 10,
      };
      if (statusFilter !== "all") {
        query.status = statusFilter;
      }

      const res = await api.getOrders(query);
      if (res.success && res.data) {
        const payload = res.data as { orders: Order[]; pagination: { total_pages: number; total: number } };
        setOrders(payload.orders as Order[] || []);
        setTotalPages(payload.pagination?.total_pages || 1);
        setTotal(payload.pagination?.total || 0);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, lang, fetchOrders, router]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const res = await api.cancelOrder(orderId);
      if (res.success) {
        toast.success("Order cancelled successfully");
        fetchOrders();
      } else {
        toast.error(res.error?.message || "Failed to cancel order");
      }
    } catch {
      toast.error("Failed to cancel order");
    }
  };

  const statusTabs = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "paid,processing,purchased", label: "Processing" },
    { value: "shipped,in_transit", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      {/* Status Filter Tabs */}
      <Tabs
        value={statusFilter}
        onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
        className="mb-6"
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-16 h-16 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-xl font-bold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-8">
            Start shopping to see your orders here
          </p>
          <Link href={`/${lang}/products`}>
            <Button>Browse Products</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              {/* Order Header */}
              <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono">{order.order_no}</span>
                  <Badge
                    className={`${
                      STATUS_COLORS[order.status] || "bg-gray-500"
                    } text-white`}
                  >
                    {getStatusLabel(order.status, lang)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Order Items Preview */}
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Show up to 3 items */}
                  {(order.items || []).slice(0, 3).map((item) => (
                    <Link
                      key={item.id}
                      href={`/${lang}/orders/${order.id}`}
                      className="flex gap-3 hover:bg-muted/30 -mx-4 px-4 py-2 rounded transition-colors"
                    >
                      {item.cover_image ? (
                        <Image
                          src={item.cover_image}
                          alt={item.title}
                          width={48}
                          height={48}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-1">
                          {item.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={`${
                              PLATFORM_COLORS[item.platform] || "bg-gray-500"
                            } text-white text-xs`}
                          >
                            {PLATFORM_NAMES[item.platform] || item.platform}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            x{item.quantity}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        {formatCurrency(
                          order.total_currency === "JPY"
                            ? item.subtotal_jpy
                            : item.subtotal_cny,
                          order.total_currency,
                        )}
                      </div>
                    </Link>
                  ))}

                  {order.items_count > 3 && (
                    <div className="text-xs text-muted-foreground text-center py-1">
                      +{order.items_count - 3} more items
                    </div>
                  )}
                </div>

                {/* Order Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {formatCurrency(
                        order.total_amount,
                        order.total_currency,
                      )}
                    </span>
                    {order.tracking_number && (
                      <span className="text-xs text-muted-foreground">
                        Tracking: {order.tracking_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/${lang}/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {order.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
