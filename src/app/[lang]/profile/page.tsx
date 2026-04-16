"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  paid: "bg-blue-500",
  processing: "bg-purple-500",
  purchased: "bg-indigo-500",
  shipped: "bg-orange-500",
  in_transit: "bg-teal-500",
  delivered: "bg-green-500",
  cancelled: "bg-red-500",
  refunded: "bg-gray-500",
};

export default function ProfilePage() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, user, logout, isLoading: authLoading } = useAuthStore();

  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchOrders();
      fetchAddresses();
    }
  }, [isAuthenticated, authLoading, lang]);

  const fetchOrders = async () => {
    try {
      const res = await api.getOrders({ limit: 5 });
      if (res.success && res.data && typeof res.data === "object") {
        const data = res.data as any;
        setOrders(Array.isArray(data.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await api.getAddresses();
      if (res.success && res.data && Array.isArray(res.data)) {
        setAddresses(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm(t("profile.logoutConfirm"))) {
      logout();
      router.push(`/${lang}/login`);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t("order.statusPending"),
      paid: t("order.statusPaid"),
      processing: t("order.statusProcessing"),
      purchased: t("order.statusPurchased"),
      shipped: t("order.statusShipped"),
      in_transit: t("order.statusInTransit"),
      delivered: t("order.statusDelivered"),
      cancelled: t("order.statusCancelled"),
      refunded: t("order.statusRefunded"),
    };
    return statusMap[status] || status;
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "USD":
        return "$";
      case "JPY":
        return "¥";
      default:
        return "¥";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "zh-CN");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold mb-2">{t("profile.loginToView")}</h1>
          <p className="text-muted-foreground mb-6">{t("profile.loginPrompt")}</p>
          <div className="flex flex-col gap-3">
            <Link href={`/${lang}/login`}>
              <Button className="w-full bg-rose-600 hover:bg-rose-700">
                {t("profile.loginBtn")}
              </Button>
            </Link>
            <Link href={`/${lang}/register`}>
              <Button variant="outline" className="w-full">
                {t("profile.registerBtn")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">{t("profile.title")}</h1>
        <p className="text-muted-foreground">
          {t("profile.welcomeBack")}, {user?.name}！
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - User Info */}
        <div className="space-y-6">
          {/* User Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4 bg-rose-100">
                  <AvatarFallback className="bg-rose-100 text-rose-600 text-xl font-bold">
                    {user?.name ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{user?.name}</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {user?.phone && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("profile.phone")}: {user.phone}
                  </p>
                )}
                {user?.role && (
                  <Badge variant="outline" className="mt-2">
                    {user.role === "admin" ? "管理员" : "会员"}
                  </Badge>
                )}
              </div>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("profile.language")}</span>
                  <span className="font-medium capitalize">{user?.preferredLanguage || lang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("profile.currency")}</span>
                  <span className="font-medium">{user?.preferredCurrency || "CNY"}</span>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex flex-col gap-2">
                <Link href={`/${lang}/profile`}>
                  <Button variant="outline" className="w-full justify-start">
                    {t("profile.editProfile")}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  {t("profile.logout")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("profile.settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link href={`/${lang}/addresses`}>
                <Button variant="ghost" className="w-full justify-start">
                  📍 {t("profile.myAddresses")}
                </Button>
              </Link>
              <Link href={`/${lang}/orders`}>
                <Button variant="ghost" className="w-full justify-start">
                  📦 {t("profile.myOrders")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orders Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("profile.myOrders")}</CardTitle>
                <CardDescription>
                  {orders.length > 0
                    ? `${orders.length} ${t("order.items")}`
                    : t("profile.noOrders")}
                </CardDescription>
              </div>
              <Link href={`/${lang}/orders`}>
                <Button variant="ghost" size="sm">
                  {t("profile.viewAll")} →
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📦</div>
                  <p className="text-muted-foreground mb-4">{t("profile.noOrders")}</p>
                  <Link href={`/${lang}/products`}>
                    <Button variant="outline" size="sm">
                      {t("order.browseProducts")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <Link key={order.id} href={`/${lang}/orders/${order.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              #{order.orderNo || order.id.slice(0, 8)}
                            </span>
                            <Badge
                              className={`${STATUS_COLORS[order.status] || "bg-gray-500"} text-white text-xs`}
                            >
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(order.createdAt)} ·{" "}
                            {order.items?.length || 0} {t("order.items")}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-semibold">
                            {getCurrencySymbol(order.currency)}
                            {Number(order.totalAmount || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">{order.currency}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("profile.myAddresses")}</CardTitle>
                <CardDescription>
                  {loadingAddresses
                    ? t("common.loading")
                    : addresses.length === 0
                    ? t("profile.noAddresses")
                    : `${addresses.length} ${lang === "zh" ? "个地址" : lang === "en" ? "addresses" : "件"}`}
                </CardDescription>
              </div>
              <Link href={`/${lang}/addresses`}>
                <Button variant="ghost" size="sm">
                  {t("profile.viewAll")} →
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {loadingAddresses ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📍</div>
                  <p className="text-muted-foreground mb-4">{t("profile.noAddresses")}</p>
                  <Link href={`/${lang}/addresses`}>
                    <Button variant="outline" size="sm">
                      {t("address.add")}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.slice(0, 3).map((addr) => (
                    <div
                      key={addr.id}
                      className="flex items-start justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">
                          {addr.label === "home"
                            ? "🏠"
                            : addr.label === "work"
                            ? "🏢"
                            : "📍"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {addr.recipientName}
                            </p>
                            {addr.isDefault && (
                              <Badge variant="outline" className="text-xs">
                                {t("address.default")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {addr.phone}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {addr.country} {addr.state} {addr.city} {addr.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
