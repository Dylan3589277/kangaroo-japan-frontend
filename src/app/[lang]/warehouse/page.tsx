"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface WarehouseOverview {
  pendingInbound: number;
  pendingOutbound: number;
  totalStock: number;
}

interface StoreData {
  overview: WarehouseOverview;
}

const MENU_ENTRIES = [
  {
    href: "/warehouse/instore",
    icon: "📦",
    title: "订单入库",
    desc: "扫码或输入订单号入库",
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    iconBg: "bg-blue-100",
  },
  {
    href: "/warehouse/orders",
    icon: "📋",
    title: "已入库订单",
    desc: "查看和管理已入库订单",
    color: "bg-green-50 border-green-200 hover:bg-green-100",
    iconBg: "bg-green-100",
  },
  {
    href: "/warehouse/shipments",
    icon: "🚚",
    title: "出库申请",
    desc: "处理出库发货申请",
    color: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    iconBg: "bg-purple-100",
  },
  {
    href: "/warehouse/print",
    icon: "🖨️",
    title: "自助打印",
    desc: "打印标签和面单",
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    iconBg: "bg-orange-100",
  },
  {
    href: "/warehouse/photos",
    icon: "📸",
    title: "拍照订单",
    desc: "为订单商品拍照存档",
    color: "bg-pink-50 border-pink-200 hover:bg-pink-100",
    iconBg: "bg-pink-100",
  },
  {
    href: "/warehouse/pick",
    icon: "🔍",
    title: "盘货",
    desc: "库存盘点与管理",
    color: "bg-teal-50 border-teal-200 hover:bg-teal-100",
    iconBg: "bg-teal-100",
  },
];

export default function WarehousePage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [overview, setOverview] = useState<WarehouseOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchOverview();
    }
  }, [isAuthenticated, authLoading, lang]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.request<StoreData>("/stores/index", {
        method: "POST",
      });
      if (res.success && res.data) {
        setOverview(res.data.overview);
      }
    } catch (error) {
      console.error("Failed to fetch warehouse overview:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🏭</div>
        <h1 className="text-2xl font-bold mb-2">请先登录</h1>
        <p className="text-muted-foreground mb-6">登录后访问仓库管理后台</p>
        <Link href={`/${lang}/login`}>
          <Button className="bg-rose-600 hover:bg-rose-700">去登录</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">仓库管理</h1>
        <p className="text-muted-foreground text-sm">仓库运营概览与管理入口</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {loading ? (
                <Skeleton className="h-8 w-16 mx-auto" />
              ) : (
                overview?.pendingInbound ?? 0
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">待入库</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-orange-600">
              {loading ? (
                <Skeleton className="h-8 w-16 mx-auto" />
              ) : (
                overview?.pendingOutbound ?? 0
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">待出库</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">
              {loading ? (
                <Skeleton className="h-8 w-16 mx-auto" />
              ) : (
                overview?.totalStock ?? 0
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">库存总数</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Entry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {MENU_ENTRIES.map((entry) => (
          <Link key={entry.href} href={`/${lang}${entry.href}`}>
            <Card
              className={`cursor-pointer transition-colors border ${entry.color}`}
            >
              <CardContent className="pt-6 pb-5">
                <div
                  className={`w-10 h-10 rounded-lg ${entry.iconBg} flex items-center justify-center text-lg mb-3`}
                >
                  {entry.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1">{entry.title}</h3>
                <p className="text-xs text-muted-foreground">{entry.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
