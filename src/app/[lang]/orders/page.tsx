"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { OrdersTcgList, OrdersTcgLoading } from "@/components/orders/orders-tcg";

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

/**
 * 代拍单（老后台 st_orders，只读并入）。后端 GET /orders/legacy/mine 已脱敏投影：
 * 仅含下列客户安全字段；金额为 JPY 整数字符串（不除 100）；快递号已脱敏。
 * 后端 OFF / 未绑定 / 上游不可用时返空数组，本段静默不展示。
 */
interface LegacyMineOrder {
  order_id: string | null;
  order_no: string | null;
  goods_name: string | null;
  status: number | null;
  amount: string | null;
  amount_rmb: string | null;
  created_at: string | null;
  tracking_number: string | null;
}

/** 老后台 st_orders 数字状态 → 文案（与 admin/orders 台账同一口径：九状态）。 */
const LEGACY_STATUS_LABELS: Record<string, { zh: string; en: string; ja: string }> = {
  "-1": { zh: "已取消", en: "Cancelled", ja: "キャンセル" },
  "0": { zh: "待支付", en: "Pending Payment", ja: "未払い" },
  "1": { zh: "待客服确认", en: "Awaiting Confirmation", ja: "確認待ち" },
  "2": { zh: "待入库", en: "Awaiting Warehouse", ja: "入庫待ち" },
  "3": { zh: "已入库", en: "In Warehouse", ja: "入庫済み" },
  "4": { zh: "出库中", en: "Dispatching", ja: "出庫中" },
  "5": { zh: "已出库", en: "Dispatched", ja: "出庫済み" },
  "6": { zh: "申请退款", en: "Refund Requested", ja: "返金申請中" },
  "7": { zh: "已退款", en: "Refunded", ja: "返金済み" },
};

function getLegacyStatusLabel(status: number | null, lang: string): string {
  if (status === null || status === undefined) return "-";
  const entry = LEGACY_STATUS_LABELS[String(status)];
  if (!entry) return String(status);
  return entry[lang as keyof typeof entry] || entry.zh;
}

/** 代拍单段标题（平台无关——这些是经客服/自助建到老库的网页代拍单）。 */
const PROXY_SECTION_TITLE: Record<string, string> = {
  zh: "代拍订单",
  en: "Proxy-buy Orders",
  ja: "代行注文",
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
  const t = useTranslations("order");
  // en 走设计方向 A 深色呈现，其它语言保持现有渲染。仅影响视觉，业务逻辑共用。
  const isEn = lang === "en";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [legacyOrders, setLegacyOrders] = useState<LegacyMineOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  // 代拍单（老库 st_orders 只读并入）：独立拉取、fail-soft——任何失败/OFF/未绑定
  // 都只置空数组，绝不影响上方现有订单列表的展示。代拍单不分页（一次取前 50）。
  const fetchLegacyOrders = useCallback(async () => {
    try {
      const res = await api.getMyLegacyOrders({ page: 1, limit: 50 });
      if (res.success && Array.isArray(res.data)) {
        setLegacyOrders(res.data as LegacyMineOrder[]);
      } else {
        setLegacyOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch proxy-buy orders:", error);
      setLegacyOrders([]);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchOrders();
      fetchLegacyOrders();
    }
  }, [isAuthenticated, authLoading, lang, fetchOrders, fetchLegacyOrders, router]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(t("confirmCancel"))) return;

    try {
      const res = await api.cancelOrder(orderId);
      if (res.success) {
        toast.success(t("orderCancelled"));
        fetchOrders();
      } else {
        toast.error(res.error?.message || t("cancelFailed"));
      }
    } catch {
      toast.error(t("cancelFailed"));
    }
  };

  // 标签文案走 i18n：en namespace 仍是英文，故 en 深色版收到的也是英文，零回归。
  const statusTabs = [
    { value: "all", label: t("tabAll") },
    { value: "pending", label: t("tabPending") },
    { value: "paid,processing,purchased", label: t("tabProcessing") },
    { value: "shipped,in_transit", label: t("tabShipped") },
    { value: "delivered", label: t("tabDelivered") },
  ];

  // 代拍单段（只读并入）：仅当有代拍单时才渲染；OFF/未绑定/上游不可用 → 返空 → 不显示。
  // 与上方现有订单完全独立的一块，纯展示、无操作（只读），不影响现有渲染。
  const legacySection =
    legacyOrders.length > 0 ? (
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">
          {PROXY_SECTION_TITLE[lang] || PROXY_SECTION_TITLE.zh}
        </h2>
        <div className="space-y-3">
          {legacyOrders.map((order, index) => (
            <Card
              key={order.order_id ?? order.order_no ?? `legacy-${index}`}
              className="overflow-hidden"
            >
              <div className="bg-muted/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono">
                    {order.order_no || order.order_id || "-"}
                  </span>
                  <Badge variant="outline">
                    {PROXY_SECTION_TITLE[lang] || PROXY_SECTION_TITLE.zh}
                  </Badge>
                  <Badge className="bg-slate-500 text-white">
                    {getLegacyStatusLabel(order.status, lang)}
                  </Badge>
                </div>
                {order.created_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium line-clamp-2">
                      {order.goods_name || "-"}
                    </div>
                    {order.tracking_number && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("tracking")}: {order.tracking_number}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {order.amount && (
                      <div className="text-sm font-semibold">
                        ¥{Math.round(Number(order.amount) || 0).toLocaleString()}
                      </div>
                    )}
                    {order.amount_rmb && (
                      <div className="text-xs text-muted-foreground">
                        ≈ ¥{order.amount_rmb} CNY
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ) : null;

  if (isEn) {
    // 设计 A 深色订单列表：取数/过滤/分页/取消回调全部沿用上方逻辑，只换视觉。
    if (authLoading) {
      return <OrdersTcgLoading title="My Orders" />;
    }
    return (
      <>
      <OrdersTcgList
        texts={{
          title: "My Orders",
          emptyTitle: "No orders yet",
          emptySubtitle: "Start shopping to see your orders here",
          browseProducts: "Browse Products",
          noImage: "No Image",
          moreItems: "+{n} more items",
          trackingLabel: "Tracking",
          viewDetails: "View Details",
          cancel: "Cancel",
          previous: "Previous",
          next: "Next",
          pageOf: "Page {page} of {total}",
        }}
        lang={lang}
        orders={orders}
        statusTabs={statusTabs}
        statusFilter={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((p) => p - 1)}
        onNextPage={() => setPage((p) => p + 1)}
        loading={loading}
        getStatusLabel={(status) => getStatusLabel(status, lang)}
        formatCurrency={(amount, currency) => formatCurrency(amount, currency)}
        onCancelOrder={handleCancelOrder}
      />
      {legacyOrders.length > 0 && (
        <div className="bg-[#0a0e16] text-slate-200">
          <div className="mx-auto max-w-4xl px-4 pb-10">
            <h2 className="mb-3 text-lg font-bold text-white">
              {PROXY_SECTION_TITLE.en}
            </h2>
            <div className="space-y-3">
              {legacyOrders.map((order, index) => (
                <section
                  key={order.order_id ?? order.order_no ?? `legacy-${index}`}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.02] px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-slate-300">
                        {order.order_no || order.order_id || "-"}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                        {PROXY_SECTION_TITLE.en}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-slate-200">
                        {getLegacyStatusLabel(order.status, lang)}
                      </span>
                    </div>
                    {order.created_at && (
                      <span className="text-xs text-slate-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium text-slate-100">
                        {order.goods_name || "-"}
                      </div>
                      {order.tracking_number && (
                        <div className="mt-1 text-xs text-slate-400">
                          Tracking: {order.tracking_number}
                        </div>
                      )}
                    </div>
                    {order.amount && (
                      <div className="text-sm font-semibold text-white">
                        ¥{Math.round(Number(order.amount) || 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

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
          <h2 className="text-xl font-bold mb-2">{t("empty")}</h2>
          <p className="text-muted-foreground mb-8">
            {t("emptySubtitle")}
          </p>
          <Link href={`/${lang}/products`}>
            <Button>{t("browseProducts")}</Button>
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
                          {t("noImage")}
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
                      {t("moreItems", { count: order.items_count - 3 })}
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
                        {t("tracking")}: {order.tracking_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/${lang}/orders/${order.id}`}>
                      <Button variant="outline" size="sm">
                        {t("viewDetails")}
                      </Button>
                    </Link>
                    {order.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        {t("cancel")}
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
                {t("previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("pageOf", { page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("next")}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 代拍单（老库 st_orders 只读并入）：独立一块，OFF/空时不渲染。 */}
      {legacySection}
    </div>
  );
}
