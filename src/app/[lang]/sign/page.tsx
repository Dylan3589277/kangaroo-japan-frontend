"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface SignDay {
  index: number;
  score: number;
  signed: boolean;
}

interface SignCoupon {
  id: string;
  name: string;
  amount: number;
  min_amount: number;
  expired_at: string;
}

interface SignData {
  myscore: number;
  signDays: SignDay[];
  coupons: SignCoupon[];
}

const DAY_LABELS = ["第1天", "第2天", "第3天", "第4天", "第5天", "第6天", "第7天"];
const DAY_SCORES = [5, 10, 15, 15, 15, 15, 25];
const DAY_ICONS = ["⭐", "⭐", "⭐", "⭐", "⭐", "⭐", "🏆"];

export default function SignPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [signData, setSignData] = useState<SignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const lastClickRef = useRef(0);

  const fetchSignData = async () => {
    setLoading(true);
    try {
      const res = await api.request<SignData>("/sign/index");
      if (res.success && res.data) {
        setSignData(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch sign data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchSignData();
    }
  }, [isAuthenticated, authLoading, lang, router]);

  const handleSign = async () => {
    // Throttle: prevent double click within 2 seconds
    const now = Date.now();
    if (now - lastClickRef.current < 2000) return;
    lastClickRef.current = now;

    setSigning(true);
    try {
      const res = await api.request<{ errmsg: string }>("/sign/sign", {
        method: "POST",
      });
      if (res.success) {
        toast.success(res.data?.errmsg || "签到成功！");
        fetchSignData();
      } else {
        toast.error(res.error?.message || "签到失败");
      }
    } catch {
      toast.error("签到失败，请稍后重试");
    } finally {
      setSigning(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  const allSigned = signData?.signDays?.every((d) => d.signed) ?? false;

  const getTitle = () => {
    const titles: Record<string, string> = {
      zh: "签到中心",
      en: "Check-in Center",
      ja: "チェックインセンター",
    };
    return titles[lang] || titles.zh;
  };

  const getScoreLabel = () => {
    const labels: Record<string, string> = {
      zh: "我的积分",
      en: "My Points",
      ja: "マイポイント",
    };
    return labels[lang] || labels.zh;
  };

  const getSignBtnLabel = () => {
    if (signing) {
      const labels: Record<string, string> = {
        zh: "签到中...",
        en: "Signing in...",
        ja: "チェックイン中...",
      };
      return labels[lang] || labels.zh;
    }
    if (allSigned) {
      const labels: Record<string, string> = {
        zh: "已全部签到",
        en: "All Signed",
        ja: "全て完了",
      };
      return labels[lang] || labels.zh;
    }
    const labels: Record<string, string> = {
      zh: "立即签到",
      en: "Check In Now",
      ja: "チェックイン",
    };
    return labels[lang] || labels.zh;
  };

  const getCouponTitle = () => {
    const labels: Record<string, string> = {
      zh: "签到优惠券",
      en: "Check-in Coupons",
      ja: "チェックインクーポン",
    };
    return labels[lang] || labels.zh;
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-lg">
        <Skeleton className="h-48 w-full rounded-xl mb-6" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold mb-2">请先登录</h1>
        <p className="text-muted-foreground mb-6">登录后即可参与签到</p>
        <Button
          className="bg-rose-600 hover:bg-rose-700"
          onClick={() => router.push(`/${lang}/login`)}
        >
          去登录
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-lg">
      {/* Header Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 p-8 text-white">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">{getTitle()}</h1>
          <p className="text-white/80 text-sm mb-4">
            {lang === "zh"
              ? "每日签到领取积分，连续签到奖励更多！"
              : lang === "ja"
              ? "毎日チェックインしてポイントを獲得！"
              : "Check in daily for points, more rewards for consecutive days!"}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-3xl">💎</span>
            <div>
              <p className="text-xs text-white/70">{getScoreLabel()}</p>
              <p className="text-3xl font-bold">
                {signData?.myscore ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/4" />
      </div>

      {/* 7-day Check-in List */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold mb-4">
            {lang === "zh"
              ? "本周签到"
              : lang === "ja"
              ? "今週のチェックイン"
              : "This Week's Check-in"}
          </h2>

          {loading ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {signData?.signDays?.map((day) => (
                <div
                  key={day.index}
                  className={`flex flex-col items-center justify-center aspect-square rounded-xl border-2 transition-all ${
                    day.signed
                      ? "bg-gradient-to-b from-orange-100 to-rose-100 border-orange-400 shadow-sm"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <span className="text-xl mb-1">
                    {day.signed ? DAY_ICONS[day.index - 1] || "✅" : "⭕"}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      day.signed ? "text-orange-600" : "text-gray-400"
                    }`}
                  >
                    {DAY_LABELS[day.index - 1]}
                  </span>
                  <span
                    className={`text-xs ${
                      day.signed ? "text-orange-500" : "text-gray-400"
                    }`}
                  >
                    +{DAY_SCORES[day.index - 1]}分
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Sign Button */}
          <Button
            className="w-full mt-6 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold text-lg py-6"
            disabled={allSigned || signing || loading}
            onClick={handleSign}
          >
            {getSignBtnLabel()}
          </Button>

          {allSigned && (
            <p className="text-center text-sm text-green-600 mt-2">
              ✅{" "}
              {lang === "zh"
                ? "本周已全部签到，明天继续！"
                : lang === "ja"
                ? "今週は全て完了、また明日！"
                : "All checked in this week, come back tomorrow!"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Coupons */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-bold mb-4">{getCouponTitle()}</h2>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : !signData?.coupons || signData.coupons.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🎫</div>
              <p className="text-muted-foreground text-sm">
                {lang === "zh"
                  ? "暂无可用优惠券"
                  : lang === "ja"
                  ? "利用可能なクーポンはありません"
                  : "No coupons available"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {signData.coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="flex items-center justify-between p-4 rounded-xl border bg-gradient-to-r from-rose-50 to-orange-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎫</span>
                    <div>
                      <p className="font-bold text-sm">{coupon.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {lang === "zh"
                          ? `满${coupon.min_amount}元减${coupon.amount}元`
                          : lang === "ja"
                          ? `${coupon.min_amount}円以上で${coupon.amount}円引き`
                          : `¥${coupon.min_amount} min spend, save ¥${coupon.amount}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(coupon.expired_at)}
                        {lang === "zh" ? " 过期" : lang === "ja" ? " 期限" : " expiry"}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-rose-500 text-white">领取</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
