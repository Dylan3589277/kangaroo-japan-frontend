"use client";

import { useEffect, useState } from "react";
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
import Link from "next/link";

interface LevelBenefit {
  label: string;
  value: string;
}

interface Level {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  benefits: LevelBenefit[];
  badge?: string;
  color?: string;
  discount?: number;
}

interface MyLevel {
  id: string;
  name: string;
  expiredAt?: string;
}

interface LevelsData {
  levels: Level[];
  myLevel?: MyLevel;
}

export default function VipPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [data, setData] = useState<LevelsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchLevels();
    }
  }, [isAuthenticated, authLoading, lang]);

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const res = await api.request<LevelsData>("/levels/lists");
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch VIP levels:", error);
      toast.error("获取VIP等级列表失败");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (level: Level) => {
    setSelectedLevel(level);
    setBuyDialogOpen(true);
  };

  const confirmBuy = async () => {
    if (!selectedLevel) return;
    setBuying(true);
    try {
      const res = await api.request("/levels/buy", {
        method: "POST",
        body: { levelId: selectedLevel.id },
      });
      if (res.success && res.data) {
        const data = res.data as { orderNo?: string; paymentNo?: string };
        toast.success(`购买成功: ${selectedLevel.name}`);
        setBuyDialogOpen(false);
        fetchLevels();
        if (data.paymentNo) {
          router.push(`/${lang}/payment/${data.paymentNo}`);
        }
      } else {
        toast.error(res.error?.message || "购买失败");
      }
    } catch (error) {
      toast.error("购买失败，请稍后重试");
    } finally {
      setBuying(false);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">VIP 会员</h1>
        <p className="text-muted-foreground">选择适合您的会员等级，享受更多专属权益</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Current Level Banner */}
          {data?.myLevel && (
            <Card className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-100 mb-1">当前会员</p>
                  <p className="text-2xl font-bold">{data.myLevel.name}</p>
                  {data.myLevel.expiredAt && (
                    <p className="text-xs text-amber-200 mt-1">
                      有效期至: {new Date(data.myLevel.expiredAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge className="bg-white text-amber-700 text-sm px-4 py-1">
                  已激活
                </Badge>
              </CardContent>
            </Card>
          )}

          {/* Level Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.levels.map((level) => {
              const isOwned = data?.myLevel?.id === level.id;
              return (
                <Card
                  key={level.id}
                  className={`relative overflow-hidden transition-all hover:shadow-lg ${
                    isOwned ? "ring-2 ring-amber-500" : ""
                  }`}
                >
                  {/* Level Badge */}
                  {level.badge && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-amber-500 text-white">{level.badge}</Badge>
                    </div>
                  )}

                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold mb-2">{level.name}</h3>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-3xl font-bold">
                          ¥{level.price}
                        </span>
                        {level.originalPrice && level.originalPrice > level.price && (
                          <span className="text-sm text-muted-foreground line-through">
                            ¥{level.originalPrice}
                          </span>
                        )}
                      </div>
                      {level.discount && (
                        <p className="text-xs text-green-600 mt-1">
                          省 ¥{level.discount}
                        </p>
                      )}
                    </div>

                    {/* Benefits */}
                    <ul className="space-y-3 mb-6">
                      {level.benefits.map((benefit, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm"
                        >
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          <span>
                            <strong>{benefit.label}</strong>
                            {benefit.value && `: ${benefit.value}`}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* Buy Button */}
                    <Button
                      className={`w-full ${
                        isOwned
                          ? "bg-gray-200 text-gray-500 hover:bg-gray-200 cursor-default"
                          : level.color
                          ? `bg-${level.color}-600 hover:bg-${level.color}-700`
                          : "bg-rose-600 hover:bg-rose-700"
                      }`}
                      onClick={() => !isOwned && handleBuy(level)}
                      disabled={isOwned}
                    >
                      {isOwned ? "已拥有" : "立即开通"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Buy Confirmation Dialog */}
      <Dialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认开通</DialogTitle>
            <DialogDescription>
              您即将开通 {selectedLevel?.name}，费用为 ¥{selectedLevel?.price}
            </DialogDescription>
          </DialogHeader>

          {selectedLevel?.benefits && (
            <div className="py-4">
              <p className="text-sm font-medium mb-3">包含权益：</p>
              <ul className="space-y-2">
                {selectedLevel.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                    <span>
                      <strong>{benefit.label}</strong>
                      {benefit.value && `: ${benefit.value}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBuyDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={confirmBuy}
              disabled={buying}
            >
              {buying ? "处理中..." : `确认支付 ¥${selectedLevel?.price}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
