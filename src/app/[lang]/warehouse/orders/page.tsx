"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  image?: string;
}

interface InboundOrder {
  id: string;
  orderNo: string;
  items: OrderItem[];
  status: string;
  createdAt: string;
  receivedAt?: string;
}

interface OrdersData {
  list: InboundOrder[];
  total: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待入库",
  received: "已入库",
  confirmed: "已确认",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  received: "bg-green-500",
  confirmed: "bg-blue-500",
};

export default function WarehouseOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [orders, setOrders] = useState<InboundOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<OrdersData>("/stores/orders", {
        method: "POST",
        body: { page, limit: 10, keyword: search.trim() || undefined },
      });
      if (res.success && res.data) {
        const data = res.data;
        setOrders(data.list || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch inbound orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, lang, fetchOrders]);

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
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
        <h1 className="text-2xl font-bold">已入库订单</h1>
        <p className="text-sm text-muted-foreground">
          查看和管理所有已入库的订单
        </p>
      </div>

      {/* Search Filter */}
      <div className="flex gap-3 mb-6">
        <Input
          placeholder="搜索订单号"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={handleSearch}
          disabled={loading}
        >
          {loading ? "搜索中..." : "搜索"}
        </Button>
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
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-lg font-semibold mb-1">暂无入库订单</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {search ? "没有匹配的订单，请尝试其他关键词" : "还没有已入库的订单"}
          </p>
          {search ? (
            <Button variant="outline" onClick={() => { setSearch(""); setPage(1); }}>
              清除搜索
            </Button>
          ) : (
            <Link href={`/${lang}/warehouse/instore`}>
              <Button variant="outline">去入库</Button>
            </Link>
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
                          入库时间:{" "}
                          {order.receivedAt
                            ? formatDate(order.receivedAt)
                            : formatDate(order.createdAt)}
                        </span>
                        <span>
                          {(order.items || []).length} 件商品
                        </span>
                      </div>
                      {/* Items Preview */}
                      <div className="flex gap-2 mt-2">
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
