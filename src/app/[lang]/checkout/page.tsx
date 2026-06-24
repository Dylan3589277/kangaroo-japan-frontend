"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import MercariCheckout from "@/components/checkout/mercari-checkout";
import ProxyBuyCheckout from "@/components/checkout/proxy-buy-checkout";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Address {
  id: string;
  recipient_name: string;
  phone: string;
  country: string;
  country_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  full_address_text?: { zh?: string; en?: string; ja?: string };
  label: string;
  is_default: boolean;
}

interface CartItem {
  id: string;
  product: {
    id: string;
    title: string;
    coverImage: string | null;
    platform: string;
    priceJpy: number;
    priceCny: number;
  };
  quantity: number;
  unitPriceJpy: number;
  unitPriceCny: number;
  subtotalJpy: number;
  subtotalCny: number;
  options: Record<string, unknown>;
  seller: { id: string; name: string };
}

interface CartSummary {
  totalItems: number;
  subtotalJpy: number;
  subtotalCny: number;
  subtotalUsd: number;
  estimatedShippingJpy: number;
  estimatedShippingCny: number;
  totalJpy: number;
  totalCny: number;
  currency: string;
}

interface CartData {
  id: string;
  items: CartItem[];
  summary: CartSummary;
  groupedBySeller: { seller: { id: string; name: string }; items: CartItem[]; subtotal: number }[];
}

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

const PLATFORM_NAMES: Record<string, string> = {
  amazon: "Amazon",
  mercari: "Mercari",
  rakuten: "Rakuten",
  yahoo: "Yahoo",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  JPY: "¥",
};

function formatCurrency(amount: number, currency: string = "CNY"): string {
  if (currency === "JPY") return `¥${Math.round(amount).toLocaleString()}`;
  if (currency === "USD") return `$${amount.toFixed(2)}`;
  return `¥${amount.toFixed(2)}`;
}

// 通用「网页代拍」结算支持的平台（平台无关；新平台在此加一个 code 即可复用）。
const PROXY_BUY_PLATFORMS = new Set([
  "rakuma",
  "yahoofrima",
  "paypay",
  "cardrush",
]);

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  // Mercari 网页结算（type=mercari&id=...）走专用流程：委托下单 → NewAge 在线全额支付。
  if (type === "mercari") {
    return <MercariCheckout />;
  }
  // 通用网页代拍（type=rakuma|yahoofrima|...&id=...）：建单 → Stripe(en)/NewAge(zh)，人工履约。
  if (type && PROXY_BUY_PLATFORMS.has(type)) {
    return <ProxyBuyCheckout platform={type} />;
  }
  return <CartCheckoutPage />;
}

function CartCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("checkout");
  const lang = (params.lang as string) || "zh";
  // 英文站面向海外，绝不显示人民币：默认美元，币种选择器也剔除 CNY。
  const isEn = lang === "en";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [cart, setCart] = useState<CartData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    isEn ? "USD" : "CNY",
  );
  const [buyerMessage, setBuyerMessage] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [cartRes, addrRes] = await Promise.all([
        api.getCart(),
        api.getAddresses(),
      ]);

      if (cartRes.success && cartRes.data) {
        setCart(cartRes.data as CartData);
      }
      if (addrRes.success && addrRes.data) {
        const addrList = addrRes.data as Address[];
        setAddresses(addrList);
        const defaultAddr = addrList.find((a) => a.is_default);
        setSelectedAddressId(defaultAddr?.id || addrList[0]?.id || "");
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, authLoading, lang, fetchData, router]);

  const handleSubmitOrder = async () => {
    if (!selectedAddressId) {
      toast.error(t("selectAddress"));
      return;
    }
    if (!cart || cart.items.length === 0) {
      toast.error(t("cartEmpty"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createOrder({
        addressId: selectedAddressId,
        currency: selectedCurrency,
        items: cart.items.map((item) => ({ cartItemId: item.id })),
        buyerMessage: buyerMessage || undefined,
        couponCode: couponCode || undefined,
      });

      if (res.success && res.data) {
        toast.success(t("orderSuccess"));
        const orderData = res.data as { order_id?: string };
        router.push(`/${lang}/orders/${orderData.order_id}`);
      } else {
        toast.error(res.error?.message || t("createOrderFailed"));
      }
    } catch (error) {
      toast.error(t("createOrderFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold mb-2">{t("cartEmpty")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("cartEmptySubtitle")}
        </p>
        <Link href={`/${lang}/products`}>
          <Button>{t("browseProducts")}</Button>
        </Link>
      </div>
    );
  }

  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);

  // Calculate totals based on selected currency
  const getSubtotal = () => {
    if (selectedCurrency === "JPY") return cart.summary.subtotalJpy;
    if (selectedCurrency === "USD") return cart.summary.subtotalUsd;
    return cart.summary.subtotalCny;
  };

  const getShipping = () => {
    if (selectedCurrency === "JPY") return cart.summary.estimatedShippingJpy;
    if (selectedCurrency === "USD")
      return cart.summary.estimatedShippingCny / 7.2;
    return cart.summary.estimatedShippingCny;
  };

  const total = getSubtotal() + getShipping();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Addresses & Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Address */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>1. {t("step1")}</span>
                <Link
                  href={`/${lang}/addresses`}
                  className="text-sm font-normal text-primary hover:underline"
                >
                  + {t("addNewAddress")}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addresses.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("noAddresses")}.{" "}
                  <Link
                    href={`/${lang}/addresses`}
                    className="text-primary"
                  >
                    {t("addAnAddress")}
                  </Link>
                </p>
              ) : (
                addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedAddressId === addr.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedAddressId(addr.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {addr.recipient_name}
                          {addr.is_default && (
                            <Badge className="ml-2 text-xs" variant="secondary">
                              {t("defaultBadge")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {addr.phone}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {addr.country_name} {addr.city}{" "}
                          {addr.address_line1}
                          {addr.address_line2 && `, ${addr.address_line2}`}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border-2 ${
                          selectedAddressId === addr.id
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">2. {t("step2")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    {item.product.coverImage ? (
                      <Image
                        src={item.product.coverImage}
                        alt={item.product.title}
                        width={60}
                        height={60}
                        className="w-15 h-15 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-15 h-15 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                        {t("noImage")}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-2">
                        {item.product.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={`${
                            PLATFORM_COLORS[item.product.platform] ||
                            "bg-gray-500"
                          } text-white text-xs`}
                        >
                          {PLATFORM_NAMES[item.product.platform] ||
                            item.product.platform}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          x{item.quantity}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {/* 单品无 USD 字段：选 USD 时退回权威 JPY，绝不把人民币数值贴上 $ 误导英文用户。 */}
                      {selectedCurrency === "CNY"
                        ? formatCurrency(item.subtotalCny, "CNY")
                        : formatCurrency(item.subtotalJpy, "JPY")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Buyer Message */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">3. {t("step3")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="buyerMessage">{t("messageToSeller")}</Label>
                <Input
                  id="buyerMessage"
                  placeholder={t("messagePlaceholder")}
                  value={buyerMessage}
                  onChange={(e) => setBuyerMessage(e.target.value)}
                  className="mt-1"
                  maxLength={200}
                />
              </div>
              <div>
                <Label htmlFor="coupon">{t("couponCode")}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="coupon"
                    placeholder={t("couponPlaceholder")}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button variant="outline">{t("apply")}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("orderSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Currency Selection */}
              <div className="flex gap-2">
                {(isEn ? ["USD", "JPY"] : ["CNY", "USD", "JPY"]).map((cur) => (
                  <Button
                    key={cur}
                    variant={selectedCurrency === cur ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCurrency(cur)}
                  >
                    {cur}
                  </Button>
                ))}
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("subtotalItems", { count: cart.summary.totalItems })}
                  </span>
                  <span>
                    {formatCurrency(getSubtotal(), selectedCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("shipping")}</span>
                  <span>
                    {formatCurrency(getShipping(), selectedCurrency)}
                  </span>
                </div>
                {couponCode && (
                  <div className="flex justify-between text-green-600">
                    <span>Coupon (SAVE10)</span>
                    <span>-¥10.00</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-base">
                <span>{t("total")}</span>
                <span>{formatCurrency(total, selectedCurrency)}</span>
              </div>

              <Button
                className="w-full mt-2"
                size="lg"
                onClick={handleSubmitOrder}
                disabled={submitting || !selectedAddressId || addresses.length === 0}
              >
                {submitting ? t("processing") : t("placeOrder")}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                {t("paymentNote")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
