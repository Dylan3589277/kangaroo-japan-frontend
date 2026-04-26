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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ConfirmShipItem {
  id: string;
  title: string;
  quantity: number;
  image?: string;
}

interface ConfirmShipOrder {
  id: string;
  orderNo: string;
  items: ConfirmShipItem[];
  status: string;
  createdAt: string;
  address?: {
    recipientName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zipCode?: string;
  };
}

interface ConfirmShipListData {
  list: ConfirmShipOrder[];
  total: number;
  totalPages: number;
}

const SHIPPING_METHODS = [
  { value: "jp_post", label: "日本邮政" },
  { value: "yamato", label: "大和运输" },
  { value: "sagawa", label: "佐川急便" },
  { value: "fedex", label: "FedEx" },
  { value: "dhl", label: "DHL" },
  { value: "other", label: "其他" },
];

export default function ConfirmShipPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [orders, setOrders] = useState<ConfirmShipOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Confirm Dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ConfirmShipOrder | null>(null);
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [confirming, setConfirming] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<ConfirmShipListData>("/stores/confirmship", {
        method: "POST",
        body: { page, limit: 10 },
      });
      if (res.success && res.data) {
        const data = res.data;
        setOrders(data.list || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch confirm-ship orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, authLoading, lang, fetchOrders]);

  const openConfirmDialog = (order: ConfirmShipOrder) => {
    setSelectedOrder(order);
    setWeight("");
    setLength("");
    setWidth("");
    setHeight("");
    setShippingMethod("");
    setConfirmDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedOrder) return;
    if (!weight.trim() || !shippingMethod) {
      toast.error("请填写包裹重量并选择物流方式");
      return;
    }
    setConfirming(true);
    try {
      const body: Record<string, any> = {
        orderId: selectedOrder.id,
        weight: parseFloat(weight),
        shippingMethod,
      };
      if (length.trim()) body.length = parseFloat(length);
      if (width.trim()) body.width = parseFloat(width);
      if (height.trim()) body.height = parseFloat(height);

      const res = await api.request("/stores/confirm", {
        method: "POST",
        body,
      });
      if (res.success) {
        toast.success("出库确认成功");
        setConfirmDialogOpen(false);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        toast.error(res.error?.message || "出库确认失败");
      }
    } catch (error) {
      console.error("Failed to confirm shipment:", error);
      toast.error("出库确认失败，请重试");
    } finally {
      setConfirming(false);
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
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full mb-3 rounded-xl" />
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
        <h1 className="text-2xl font-bold">确认出库</h1>
        <p className="text-sm text-muted-foreground">
          输入包裹重量、尺寸，选择物流方式确认出库
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🚚</div>
          <h2 className="text-lg font-semibold mb-1">暂无待出库订单</h2>
          <p className="text-sm text-muted-foreground mb-6">
            所有出库申请都已处理完成
          </p>
          <Link href={`/${lang}/warehouse/shipments`}>
            <Button variant="outline">查看出库申请</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">
                        #{order.orderNo}
                      </span>
                      <Badge className="bg-blue-500 text-white text-xs">
                        待出库
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="border rounded-lg divide-y mb-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
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
                          <span className="text-sm line-clamp-1">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-sm font-mono">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Address */}
                  {order.address && (
                    <div className="bg-muted/30 rounded-lg p-3 mb-3 text-xs text-muted-foreground">
                      📍 {order.address.recipientName} · {order.address.phone}
                      <br />
                      {order.address.country} {order.address.state}{" "}
                      {order.address.city} {order.address.address}
                      {order.address.zipCode && <> · {order.address.zipCode}</>}
                    </div>
                  )}

                  <Button
                    onClick={() => openConfirmDialog(order)}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    确认出库
                  </Button>
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

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认出库</DialogTitle>
            <DialogDescription>
              订单 #{selectedOrder?.orderNo} — 填写包裹信息
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Weight */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                重量 (kg) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="如: 0.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>

            {/* Dimensions */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                尺寸 (cm) — 选填
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="长"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="宽"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="高"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
            </div>

            {/* Shipping Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                物流方式 <span className="text-red-500">*</span>
              </label>
              <Select value={shippingMethod} onValueChange={(val) => setShippingMethod(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择物流方式" />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirming ? "确认中..." : "确认出库"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
