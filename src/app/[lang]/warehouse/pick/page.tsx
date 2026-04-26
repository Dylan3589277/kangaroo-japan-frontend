"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface PickOrderItem {
  id: string;
  title: string;
  quantity: number;
  image?: string;
}

interface PickOrder {
  id: string;
  orderNo: string;
  items: PickOrderItem[];
  status: string;
  createdAt: string;
  pickedAt?: string;
}

interface PickListData {
  list: PickOrder[];
  total: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待盘货",
  picked: "已盘货",
  confirmed: "已确认",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  picked: "bg-green-500",
  confirmed: "bg-blue-500",
};

export default function PickPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [orders, setOrders] = useState<PickOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [orderNo, setOrderNo] = useState("");
  const [searching, setSearching] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<PickListData>("/stores/pick", {
        method: "POST",
        body: { page, limit: 10, keyword: orderNo.trim() || undefined },
      });
      if (res.success && res.data) {
        const data = res.data;
        setOrders(data.list || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch pick orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, orderNo]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, lang, fetchOrders]);

  const handleSearch = async () => {
    if (!orderNo.trim()) {
      toast.error("请输入订单号");
      return;
    }
    setSearching(true);
    setPage(1);
    try {
      await fetchOrders();
    } finally {
      setSearching(false);
    }
  };

  const handlePickConfirm = async (order: PickOrder) => {
    try {
      const res = await api.request("/stores/pick", {
        method: "POST",
        body: { orderId: order.id },
      });
      if (res.success) {
        toast.success("盘货确认成功");
        fetchOrders();
      } else {
        toast.error(res.error?.message || "盘货确认失败");
      }
    } catch (error) {
      console.error("Failed to confirm pick:", error);
      toast.error("盘货确认失败，请重试");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full mb-3 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold mb-2">请先登录</h1>
        <Link href={`/${lang}/login`}>
          <Button className="bg-rose-600 hover:bg-rose-700">去登录</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href={`/${lang}/warehouse`}
          className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
        >
          ← 返回仓库首页
        </Link>
        <h1 className="text-2xl font-bold">盘货</h1>
        <p className="text-sm text-muted-foreground">
          库存盘点与管理，扫描或输入订单号确认盘货
        </p>
      </div>

      {/* Search Input */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="输入或扫描订单号"
          value={orderNo}
          onChange={(e) => setOrderNo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
          autoFocus
        />
        <Button
          variant="outline"
          onClick={handleSearch}
          disabled={searching || !orderNo.trim()}
        >
          {searching ? "搜索中..." : "搜索"}
        </Button>
        {orderNo.trim() && (
          <Button
            variant="ghost"
            onClick={() => {
              setOrderNo("");
              setPage(1);
            }}
          >
            清除
          </Button>
        )}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-lg font-semibold mb-1">暂无盘货订单</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {orderNo ? "没有匹配的订单，请尝试其他订单号" : "还没有需要盘货的订单"}
          </p>
          {orderNo && (
            <Button variant="outline" onClick={() => { setOrderNo(""); setPage(1); }}>
              清除搜索
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-mono font-medium">
                          #{order.orderNo}
                        </span>
                        <Badge
                          className={`${
                            STATUS_COLORS[order.status] || "bg-gray-500"
                          } text-white text-xs`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {order.pickedAt
                            ? `盘货时间: ${formatDate(order.pickedAt)}`
                            : `创建时间: ${formatDate(order.createdAt)}`}
                        </span>
                        <span>{(order.items || []).length} 件商品</span>
                      </div>
                      {/* Items Preview */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(order.items || []).slice(0, 3).map((item) => (
                          <span
                            key={item.id}
                            className="text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[120px]"
                          >
                            {item.title}
                          </span>
                        ))}
                        {(order.items || []).length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{order.items.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {order.status === "pending" && (
                        <Button
                          onClick={() => handlePickConfirm(order)}
                          className="bg-teal-600 hover:bg-teal-700 whitespace-nowrap"
                          size="sm"
                        >
                          确认盘货
                        </Button>
                      )}
                      {order.status === "picked" && (
                        <Badge variant="outline" className="text-xs">
                          已盘货
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
