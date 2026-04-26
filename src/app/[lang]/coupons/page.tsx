"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface Coupon {
  id: string;
  name: string;
  code?: string;
  amount: number;
  type: "fixed" | "percentage" | "shipping";
  minAmount?: number;
  expiredAt: string;
  usedAt?: string;
  description?: string;
  status: "active" | "used" | "expired";
}

interface CouponsData {
  coupons: Coupon[];
  expired: Coupon[];
}

export default function CouponsPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [expiredCoupons, setExpiredCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchCoupons();
    }
  }, [isAuthenticated, authLoading, lang]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await api.request<CouponsData>("/users/coupons");
      if (res.success && res.data) {
        setActiveCoupons(res.data.coupons ?? []);
        setExpiredCoupons(res.data.expired ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch coupons:", error);
      toast.error("获取优惠券列表失败");
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string, amount: number) => {
    switch (type) {
      case "fixed":
        return `¥${amount}`;
      case "percentage":
        return `${amount}%`;
      case "shipping":
        return `免运费`;
      default:
        return `¥${amount}`;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500 text-white text-xs">未使用</Badge>;
      case "used":
        return <Badge variant="outline" className="text-xs text-muted-foreground">已使用</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-xs text-muted-foreground">已过期</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(
        lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "zh-CN"
      );
    } catch {
      return dateStr;
    }
  };

  const isExpiringSoon = (expiredAt: string) => {
    const now = new Date();
    const exp = new Date(expiredAt);
    const diff = exp.getTime() - now.getTime();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000; // within 3 days
  };

  const renderCouponCard = (coupon: Coupon) => {
    const isActive = coupon.status === "active";
    const expiringSoon = isActive && isExpiringSoon(coupon.expiredAt);

    return (
      <Card
        key={coupon.id}
        className={`overflow-hidden transition-all ${
          isActive
            ? "hover:shadow-md border-l-4 border-l-rose-500"
            : "opacity-60 border-l-4 border-l-gray-300"
        }`}
      >
        <CardContent className="p-0">
          <div className="flex">
            {/* Amount Display */}
            <div className="flex flex-col items-center justify-center min-w-[100px] p-4 bg-gradient-to-b from-rose-50 to-rose-100">
              {coupon.type === "shipping" ? (
                <span className="text-2xl font-bold text-rose-600">免邮</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-rose-600">
                    {coupon.type === "percentage" ? `${coupon.amount}%` : `¥${coupon.amount}`}
                  </span>
                  {coupon.type === "percentage" && (
                    <span className="text-xs text-muted-foreground mt-1">折扣</span>
                  )}
                </>
              )}
              {coupon.minAmount && coupon.minAmount > 0 && (
                <span className="text-xs text-muted-foreground mt-1">
                  满¥{coupon.minAmount}可用
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{coupon.name}</h3>
                  {coupon.code && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      代码: {coupon.code}
                    </p>
                  )}
                  {coupon.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {coupon.description}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {getStatusBadge(coupon.status)}
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {coupon.status === "active"
                      ? `有效期至: ${formatDate(coupon.expiredAt)}`
                      : coupon.status === "used"
                      ? `使用于: ${coupon.usedAt ? formatDate(coupon.usedAt) : "-"}`
                      : `已过期: ${formatDate(coupon.expiredAt)}`}
                  </span>
                  {expiringSoon && (
                    <Badge variant="destructive" className="text-xs animate-pulse">
                      即将过期
                    </Badge>
                  )}
                </div>
                {isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => {
                      if (coupon.code) {
                        navigator.clipboard.writeText(coupon.code);
                        toast.success("优惠码已复制");
                      }
                    }}
                  >
                    复制
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (!authLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">我的优惠券</h1>
        <p className="text-muted-foreground">
          共有 {activeCoupons.length} 张可用优惠券
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              可用 ({activeCoupons.length})
            </TabsTrigger>
            <TabsTrigger value="expired">
              已失效 ({expiredCoupons.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeCoupons.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🎫</div>
                <p className="text-xl font-medium mb-2">暂无可用优惠券</p>
                <p className="text-muted-foreground mb-6">
                  前往积分商城兑换优惠券，或关注我们的活动获取更多优惠
                </p>
                <Button
                  className="bg-rose-600 hover:bg-rose-700"
                  onClick={() => router.push(`/${lang}/shop`)}
                >
                  去积分商城看看
                </Button>
              </div>
            ) : (
              activeCoupons.map(renderCouponCard)
            )}
          </TabsContent>

          <TabsContent value="expired" className="space-y-4">
            {expiredCoupons.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-xl font-medium mb-2">暂无已失效优惠券</p>
              </div>
            ) : (
              expiredCoupons.map(renderCouponCard)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
