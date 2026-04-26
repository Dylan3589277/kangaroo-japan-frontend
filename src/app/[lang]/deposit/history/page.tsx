"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface DepositItem {
  id: string;
  amount: number;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  description?: string;
  created_at: string;
  order_no?: string;
}

interface DepositListData {
  items: DepositItem[];
  total: number;
  page: number;
  limit: number;
}

const TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  recharge: { label: "充值", icon: "💰" },
  refund: { label: "退款", icon: "↩️" },
  deduction: { label: "扣除", icon: "💸" },
  freeze: { label: "冻结", icon: "🔒" },
  unfreeze: { label: "解冻", icon: "🔓" },
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500",
  success: "bg-green-500",
  failed: "bg-red-500",
  refunding: "bg-blue-500",
};

export default function DepositHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [items, setItems] = useState<DepositItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchItems = useCallback(
    async (pageNum: number, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await api.request<DepositListData>("/deposit/list", {
          method: "POST",
          body: { page: pageNum, limit },
        });
        if (res.success && res.data) {
          const data = res.data;
          if (append) {
            setItems((prev) => [...prev, ...(data.items || [])]);
          } else {
            setItems(data.items || []);
          }
          setTotal(data.total || 0);
        } else {
          if (!append) setItems([]);
        }
      } catch (error) {
        console.error("Failed to fetch deposit history:", error);
        if (!append) setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      setPage(1);
      fetchItems(1);
    }
  }, [isAuthenticated, authLoading, lang, fetchItems, router]);

  // Infinite scroll
  useEffect(() => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    const totalPages = Math.ceil(total / limit);
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, loadingMore, page, total]);

  useEffect(() => {
    if (page > 1) {
      fetchItems(page, true);
    }
  }, [page, fetchItems]);

  const formatAmount = (amount: number) => {
    const prefix = amount >= 0 ? "+" : "";
    return `${prefix}¥${Math.abs(amount).toFixed(2)}`;
  };

  const amountColor = (amount: number) => {
    if (amount > 0) return "text-green-600";
    if (amount < 0) return "text-red-600";
    return "text-foreground";
  };

  const getTypeDisplay = (type: string) => {
    return TYPE_DISPLAY[type] || { label: type, icon: "📝" };
  };

  const getStatusStyle = (status: string) => {
    return STATUS_STYLES[status] || "bg-gray-500";
  };

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">押金明细</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-bold mb-2">暂无押金记录</h2>
          <p className="text-muted-foreground">
            充值押金后，这里将显示您的押金流水
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const typeDisplay = getTypeDisplay(item.type);
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeDisplay.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {item.type_label || typeDisplay.label}
                          </span>
                          <Badge
                            className={`${getStatusStyle(
                              item.status
                            )} text-white text-xs`}
                          >
                            {item.status_label || item.status}
                          </Badge>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-base font-semibold ${amountColor(
                          item.amount
                        )}`}
                      >
                        {formatAmount(item.amount)}
                      </p>
                      {item.order_no && (
                        <p className="text-xs text-muted-foreground">
                          订单: {item.order_no}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Sentinel */}
          <div ref={sentinelRef} className="h-4" />

          {loadingMore && (
            <div className="text-center py-4">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!loadingMore &&
            items.length > 0 &&
            items.length >= total && (
              <p className="text-center text-xs text-muted-foreground py-4">
                已加载全部记录
              </p>
            )}
        </div>
      )}
    </div>
  );
}
