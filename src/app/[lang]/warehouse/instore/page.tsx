"use client";

import { useEffect, useState } from "react";
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

interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  image?: string;
  platform?: string;
}

interface InstoreOrder {
  id: string;
  orderNo: string;
  items: OrderItem[];
  status: string;
  createdAt: string;
}

export default function InstorePage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [orderNo, setOrderNo] = useState("");
  const [order, setOrder] = useState<InstoreOrder | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
    }
  }, [isAuthenticated, authLoading, lang]);

  const handleSearch = async () => {
    if (!orderNo.trim()) {
      toast.error("请输入订单号");
      return;
    }
    setSearching(true);
    setSearched(true);
    setOrder(null);
    try {
      const res = await api.request<InstoreOrder>("/stores/instore", {
        method: "POST",
        body: { orderNo: orderNo.trim() },
      });
      if (res.success && res.data) {
        setOrder(res.data);
        toast.success("订单查询成功");
      } else {
        toast.error(res.error?.message || "未找到该订单");
      }
    } catch (error) {
      console.error("Failed to search order:", error);
      toast.error("查询失败，请重试");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirm = async () => {
    if (!order) return;
    setConfirming(true);
    try {
      const res = await api.request("/stores/confirm", {
        method: "POST",
        body: { orderId: order.id },
      });
      if (res.success) {
        toast.success("入库确认成功");
        setOrder({ ...order, status: "received" });
      } else {
        toast.error(res.error?.message || "入库确认失败");
      }
    } catch (error) {
      console.error("Failed to confirm inbound:", error);
      toast.error("入库确认失败，请重试");
    } finally {
      setConfirming(false);
    }
  };

  const handlePrintLabel = async () => {
    if (!order) return;
    try {
      const res = await api.request("/stores/printLabel", {
        method: "POST",
        body: { orderId: order.id },
      });
      if (res.success) {
        toast.success("标签打印已发送");
      } else {
        toast.error(res.error?.message || "打印失败");
      }
    } catch {
      toast.error("打印失败，请重试");
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-32 w-full rounded-xl mb-4" />
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
        <h1 className="text-2xl font-bold">订单入库</h1>
        <p className="text-sm text-muted-foreground">扫描或输入订单号进行入库操作</p>
      </div>

      {/* Search Input */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Input
              placeholder="输入或扫描订单号"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={handleSearch}
              disabled={searching || !orderNo.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {searching ? "查询中..." : "查询"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Result */}
      {searching && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {!searching && searched && !order && (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-lg font-semibold mb-1">未找到订单</h2>
            <p className="text-sm text-muted-foreground">
              请检查订单号是否正确
            </p>
          </CardContent>
        </Card>
      )}

      {!searching && order && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                订单 #{order.orderNo}
              </CardTitle>
              <Badge
                className={
                  order.status === "received"
                    ? "bg-green-500 text-white"
                    : "bg-yellow-500 text-white"
                }
              >
                {order.status === "received" ? "已入库" : "待入库"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Items */}
              <div className="border rounded-lg divide-y">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          "📦"
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium line-clamp-1">
                          {item.title}
                        </p>
                        {item.platform && (
                          <span className="text-xs text-muted-foreground">
                            {item.platform}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-mono">x{item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {order.status !== "received" && (
                  <Button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {confirming ? "确认中..." : "确认入库"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handlePrintLabel}
                  className="flex-1"
                >
                  打印标签
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
