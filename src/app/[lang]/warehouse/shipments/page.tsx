"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ShipmentAddress {
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode?: string;
}

interface ShipmentItem {
  id: string;
  title: string;
  quantity: number;
}

interface Shipment {
  id: string;
  orderNo: string;
  address: ShipmentAddress;
  items: ShipmentItem[];
  status: string;
  createdAt: string;
  note?: string;
}

interface ShipmentsData {
  list: Shipment[];
  total: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  processing: "处理中",
  packed: "已打包",
  shipped: "已发货",
  cancelled: "已取消",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  processing: "bg-blue-500",
  packed: "bg-purple-500",
  shipped: "bg-green-500",
  cancelled: "bg-gray-500",
};

export default function ShipmentsPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchShipments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.request<ShipmentsData>("/stores/ships", {
        method: "POST",
        body: { page, limit: 10 },
      });
      if (res.success && res.data) {
        const data = res.data;
        setShipments(data.list || []);
        setTotalPages(data.totalPages || 1);
      } else {
        setShipments([]);
      }
    } catch (error) {
      console.error("Failed to fetch shipments:", error);
      setShipments([]);
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
      fetchShipments();
    }
  }, [isAuthenticated, authLoading, lang, fetchShipments]);

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
          <Skeleton key={i} className="h-32 w-full mb-3 rounded-xl" />
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
        <h1 className="text-2xl font-bold">出库申请</h1>
        <p className="text-sm text-muted-foreground">
          查看和处理出库发货申请
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : shipments.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🚚</div>
          <h2 className="text-lg font-semibold mb-1">暂无出库申请</h2>
          <p className="text-sm text-muted-foreground">
            还没有出库申请记录
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {shipments.map((shipment) => (
              <Card key={shipment.id}>
                <CardContent className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-medium">
                        #{shipment.orderNo}
                      </span>
                      <Badge
                        className={`${
                          STATUS_COLORS[shipment.status] || "bg-gray-500"
                        } text-white text-xs`}
                      >
                        {STATUS_LABELS[shipment.status] || shipment.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(shipment.createdAt)}
                    </span>
                  </div>

                  {/* Address Info */}
                  <div className="bg-muted/30 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">📍</span>
                      <span className="text-sm font-medium">
                        {shipment.address.recipientName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {shipment.address.phone}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {shipment.address.country} {shipment.address.state}{" "}
                      {shipment.address.city} {shipment.address.address}
                      {shipment.address.zipCode && (
                        <> · {shipment.address.zipCode}</>
                      )}
                    </p>
                  </div>

                  {/* Items Preview */}
                  <div className="flex gap-2 flex-wrap">
                    {(shipment.items || []).map((item) => (
                      <span
                        key={item.id}
                        className="text-xs bg-muted px-2 py-0.5 rounded"
                      >
                        {item.title} x{item.quantity}
                      </span>
                    ))}
                  </div>

                  {/* Note */}
                  {shipment.note && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      备注: {shipment.note}
                    </p>
                  )}
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
