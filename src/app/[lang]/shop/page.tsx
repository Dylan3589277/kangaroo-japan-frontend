"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  points: number;
  image?: string;
  type: "coupon" | "product" | "reward";
  value?: string;
  stock?: number;
  limit?: number;
}

interface ShopData {
  list: ShopItem[];
  totalPages: number;
}

interface UserPoints {
  points: number;
}

export default function ShopPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Redeem dialog
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchPoints();
    }
  }, [isAuthenticated, authLoading, lang]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchItems();
    }
  }, [isAuthenticated, page]);

  const fetchPoints = async () => {
    try {
      const res = await api.request<UserPoints>("/users/points");
      if (res.success && res.data) {
        setPoints(res.data.points ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch points:", error);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.request<ShopData>("/shops/goods", {
        method: "POST",
        body: { page },
      });
      if (res.success && res.data) {
        setItems(res.data.list ?? []);
        setTotalPages(res.data.totalPages ?? 1);
      }
    } catch (error) {
      console.error("Failed to fetch shop items:", error);
      toast.error("获取积分商城列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = (item: ShopItem) => {
    setSelectedItem(item);
    setRedeemDialogOpen(true);
  };

  const confirmRedeem = async () => {
    if (!selectedItem) return;
    if (points < selectedItem.points) {
      toast.error("积分不足");
      setRedeemDialogOpen(false);
      return;
    }

    setRedeeming(true);
    try {
      const res = await api.request("/shops/buy", {
        method: "POST",
        body: { id: selectedItem.id },
      });
      if (res.success) {
        toast.success(`兑换成功: ${selectedItem.name}`);
        setRedeemDialogOpen(false);
        fetchPoints();
        fetchItems();
      } else {
        toast.error(res.error?.message || "兑换失败");
      }
    } catch (error) {
      toast.error("兑换失败，请稍后重试");
    } finally {
      setRedeeming(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "coupon":
        return "优惠券";
      case "product":
        return "商品";
      case "reward":
        return "奖励";
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "coupon":
        return "bg-blue-500";
      case "product":
        return "bg-green-500";
      case "reward":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">积分商城</h1>
          <p className="text-muted-foreground">使用积分兑换心仪的商品和优惠券</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">我的积分</p>
          <div className="flex items-center gap-1">
            <span className="text-3xl font-bold text-amber-500">{points}</span>
            <span className="text-sm text-muted-foreground">分</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎁</div>
          <p className="text-xl font-medium mb-2">暂无兑换商品</p>
          <p className="text-muted-foreground">敬请期待更多积分商品上架</p>
        </div>
      ) : (
        <>
          {/* Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => {
              const canAfford = points >= item.points;
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Image Placeholder */}
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl">
                        {item.type === "coupon" ? "🎫" : item.type === "product" ? "📦" : "🏆"}
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4">
                    {/* Type Badge */}
                    <Badge className={`${getTypeColor(item.type)} text-white mb-2`}>
                      {getTypeLabel(item.type)}
                    </Badge>

                    <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-amber-500">
                          {item.points}
                        </span>
                        <span className="text-xs text-muted-foreground">积分</span>
                      </div>
                      <Button
                        size="sm"
                        variant={canAfford ? "default" : "outline"}
                        className={canAfford ? "bg-rose-600 hover:bg-rose-700" : ""}
                        onClick={() => handleRedeem(item)}
                        disabled={!canAfford}
                      >
                        {canAfford ? "兑换" : "积分不足"}
                      </Button>
                    </div>

                    {item.stock !== undefined && item.stock <= 5 && item.stock > 0 && (
                      <p className="text-xs text-red-500 mt-2">
                        仅剩 {item.stock} 件
                      </p>
                    )}
                    {item.stock === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">已售罄</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                {page} / {totalPages}
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

      {/* Redeem Confirmation Dialog */}
      <Dialog open={redeemDialogOpen} onOpenChange={setRedeemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认兑换</DialogTitle>
            <DialogDescription>
              您即将兑换以下商品，请确认您的选择
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="py-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 mb-4">
                <div className="text-3xl">
                  {selectedItem.type === "coupon"
                    ? "🎫"
                    : selectedItem.type === "product"
                    ? "📦"
                    : "🏆"}
                </div>
                <div>
                  <p className="font-semibold">{selectedItem.name}</p>
                  {selectedItem.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedItem.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">所需积分</span>
                <span className="text-xl font-bold text-amber-500">
                  {selectedItem.points}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-muted-foreground">当前积分</span>
                <span
                  className={`text-xl font-bold ${
                    points >= selectedItem.points
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {points}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRedeemDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={confirmRedeem}
              disabled={redeeming || (selectedItem ? points < selectedItem.points : false)}
            >
              {redeeming
                ? "处理中..."
                : selectedItem && points < selectedItem.points
                ? "积分不足"
                : "确认兑换"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
