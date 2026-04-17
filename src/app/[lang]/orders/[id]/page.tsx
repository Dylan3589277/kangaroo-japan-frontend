"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  options: Record<string, unknown>;
  seller_id: string;
  seller_name: string;
}

interface Order {
  id: string;
  order_no: string;
  status: string;
  total_amount: number;
  total_currency: string;
  subtotal_jpy: number;
  subtotal_cny: number;
  subtotal_usd: number;
  shipping_fee_jpy: number;
  shipping_fee_cny: number;
  service_fee_jpy: number;
  service_fee_cny: number;
  coupon_discount_cny: number;
  payment_method: string | null;
  paid_at: string | null;
  tracking_number: string | null;
  shipping_carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  estimated_delivery: string | null;
  created_at: string;
  buyer_message: string | null;
  items: OrderItem[];
  address: {
    id: string;
    recipient_name: string;
    phone: string;
    country: string;
    country_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postal_code: string;
  } | null;
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
  pending: { zh: "待支付", en: "Pending Payment", ja: "未払い" },
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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const orderId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrder(orderId);
      if (res.success && res.data) {
        setOrder(res.data as Order);
      } else {
        toast.error("Order not found");
        router.push(`/${lang}/orders`);
      }
    } catch (error) {
      console.error("Failed to fetch order:", error);
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId, lang, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated && orderId) {
      fetchOrder();
    }
  }, [isAuthenticated, authLoading, lang, orderId, fetchOrder, router]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    setCancelling(true);
    try {
      const res = await api.cancelOrder(orderId);
      if (res.success) {
        toast.success("Order cancelled successfully");
        fetchOrder();
      } else {
        toast.error(res.error?.message || "Failed to cancel order");
      }
    } catch {
      toast.error("Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  const handleTrack = async () => {
    if (!order?.tracking_number) {
      toast.error("Tracking number not available yet");
      return;
    }

    // TODO: Open tracking URL based on carrier
    const carrierUrls: Record<string, string> = {
      EMS: `https://trackings.post.japanpost.jp/services/srv/search/?search1=${order.tracking_number}`,
      DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${order.tracking_number}`,
      FedEx: `https://www.fedex.com/fedextrack/?trknbr=${order.tracking_number}`,
    };

    const url = carrierUrls[order.shipping_carrier || ""] || "#";
    window.open(url, "_blank");
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-2xl font-bold mb-2">Order not found</h1>
        <Link href={`/${lang}/orders`}>
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>
    );
  }


  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back Link */}
      <Link
        href={`/${lang}/orders`}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1"
      >
        ← Back to Orders
      </Link>

      <h1 className="text-2xl font-bold mb-6">
        Order {order.order_no}
      </h1>

      {/* Status Banner */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                className={`${
                  STATUS_COLORS[order.status] || "bg-gray-500"
                } text-white text-sm px-3 py-1`}
              >
                {getStatusLabel(order.status, lang)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Placed on {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {order.tracking_number && (
                <Button variant="outline" size="sm" onClick={handleTrack}>
                  Track Package
                </Button>
              )}
              {order.status === "pending" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling..." : "Cancel Order"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Items ({order.items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(order.items || []).map((item) => (
                  <div key={item.id} className="flex gap-4">
                    {item.cover_image ? (
                      <Image
                        src={item.cover_image}
                        alt={item.title}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2">
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
                        {item.seller_name && (
                          <span className="text-xs text-muted-foreground">
                            {item.seller_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          x{item.quantity}
                        </span>
                        <span className="text-sm font-medium">
                          {formatCurrency(
                            order.total_currency === "JPY"
                              ? item.subtotal_jpy
                              : item.subtotal_cny,
                            order.total_currency,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.address && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  <div className="font-medium">{order.address.recipient_name}</div>
                  <div className="text-muted-foreground mt-1">
                    {order.address.phone}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    {order.address.country_name}
                  </div>
                  <div className="text-muted-foreground">
                    {order.address.city} {order.address.address_line1}
                    {order.address.address_line2 &&
                      `, ${order.address.address_line2}`}
                  </div>
                  <div className="text-muted-foreground">
                    {order.address.postal_code}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logistics Info */}
          {order.tracking_number && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Logistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carrier</span>
                    <span>{order.shipping_carrier || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking Number</span>
                    <span className="font-mono text-xs">{order.tracking_number}</span>
                  </div>
                  {order.shipped_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipped At</span>
                      <span>{new Date(order.shipped_at).toLocaleString()}</span>
                    </div>
                  )}
                  {order.estimated_delivery && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Delivery</span>
                      <span>{new Date(order.estimated_delivery).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Buyer Message */}
          {order.buyer_message && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Your Message</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {order.buyer_message}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Payment Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {formatCurrency(
                      order.total_currency === "JPY"
                        ? order.subtotal_jpy
                        : order.total_currency === "USD"
                          ? order.subtotal_usd
                          : order.subtotal_cny,
                      order.total_currency,
                    )}
                  </span>
                </div>
                {order.total_currency === "CNY" && order.subtotal_jpy > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>(JPY)</span>
                    <span>¥{Math.round(order.subtotal_jpy).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {formatCurrency(
                      order.total_currency === "JPY"
                        ? order.shipping_fee_jpy
                        : order.shipping_fee_cny,
                      order.total_currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span>
                    {formatCurrency(
                      order.total_currency === "JPY"
                        ? order.service_fee_jpy
                        : order.service_fee_cny,
                      order.total_currency,
                    )}
                  </span>
                </div>
                {order.coupon_discount_cny > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon Discount</span>
                    <span>-¥{order.coupon_discount_cny.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>
                  {formatCurrency(order.total_amount, order.total_currency)}
                </span>
              </div>

              {order.paid_at && (
                <div className="text-xs text-muted-foreground text-center pt-2">
                  Paid on {new Date(order.paid_at).toLocaleString()}
                </div>
              )}

              {order.payment_method && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-1">
                    Payment Method
                  </div>
                  <div className="text-sm font-medium capitalize">
                    {order.payment_method.replace(/_/g, " ")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
