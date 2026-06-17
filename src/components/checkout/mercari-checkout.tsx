"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { api, type MercariProxySubmitResult } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface MercariItem {
  goods_no: string;
  goods_name: string;
  price: number; // JPY 整数
  price_rmb?: number;
  rate?: number;
  imgurls?: string[];
  status?: string;
}

// 增值服务选项（与小程序/详情页费用结构一致；具体费用以到仓实际为准）
const VALUE_ADDED_OPTIONS = [
  { key: "inspection", labelKey: "vaInspection" },
  { key: "photo", labelKey: "vaPhoto" },
  { key: "slimPack", labelKey: "vaSlimPack" },
] as const;

// 金额一律 JPY 整数显示，不除以 100
function formatJpy(amount: number): string {
  return `¥${Math.round(amount).toLocaleString()}`;
}

// 人民币金额：保留旧端精度，沿用详情页 price_rmb 的展示（¥ 符号 + 两位小数）。
function formatRmb(amount: number): string {
  return `¥${Number(amount).toFixed(2)}`;
}

function pickAmountRmb(r: MercariProxySubmitResult): number | undefined {
  return r.amountRmb ?? r.amount_rmb;
}

function pickOrderId(r: MercariProxySubmitResult): string | undefined {
  return r.orderId ?? r.order_id;
}

function pickPayUrl(r: MercariProxySubmitResult): string | undefined {
  return r.payUrl ?? r.pay_url;
}

function pickQrcodeUrl(r: MercariProxySubmitResult): string | undefined {
  return r.qrcodeUrl ?? r.qrcode_url;
}

export default function MercariCheckout() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";
  const goodsNo = searchParams.get("id") || "";
  const t = useTranslations("mercari");
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [item, setItem] = useState<MercariItem | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<string, boolean>>(
    {},
  );
  const [buyerMessage, setBuyerMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 支付阶段状态
  const [payment, setPayment] = useState<MercariProxySubmitResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // 代购流程：下单不收地址，故只拉商品详情（地址在后续转运/出库单再填）。
      const detailRes = await api.request(`/integrations/mercari/detail`, {
        method: "POST",
        body: { id: goodsNo },
      });

      if (detailRes.success && detailRes.data) {
        const data = detailRes.data as Record<string, unknown>;
        const d = (data.detail || data.data || data) as MercariItem;
        setItem(d);
      } else {
        setLoadError(t("checkout.loadFailed"));
      }
    } catch (error) {
      console.error("Failed to load Mercari checkout:", error);
      setLoadError(t("checkout.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [goodsNo, t]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      if (!goodsNo) {
        setLoadError(t("checkout.missingItem"));
        setLoading(false);
        return;
      }
      fetchData();
    }
  }, [isAuthenticated, authLoading, lang, goodsNo, fetchData, router, t]);

  const isSoldOut =
    item?.status === "sold_out" || item?.status === "ITEM_STATUS_TRADING";

  const serializeValues = (): string => {
    const picked = VALUE_ADDED_OPTIONS.filter((o) => selectedValues[o.key]).map(
      (o) => o.key,
    );
    return picked.join(",");
  };

  const handleSubmit = async () => {
    if (!item || isSoldOut) {
      toast.error(t("checkout.soldOut"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.mercariProxySubmit({
        goodsNo,
        values: serializeValues(),
        buyerMessage: buyerMessage || undefined,
      });

      if (res.success && res.data) {
        const result = res.data;
        const orderId = pickOrderId(result);
        const payUrl = pickPayUrl(result);
        const qrcodeUrl = pickQrcodeUrl(result);

        // 兼容两种支付形态：有 payUrl 直接跳 NewAge 收银台；否则展示二维码面板。
        if (payUrl) {
          setPayment(result);
          window.location.href = payUrl;
          return;
        }
        if (qrcodeUrl) {
          setPayment(result);
          return;
        }
        // 没有任何支付凭证：下单可能已建，但拿不到支付信息——引导去我的订单，不伪装成功。
        if (orderId) {
          toast.warning(t("checkout.paymentUnavailable"));
          router.push(`/${lang}/orders/${orderId}?poll=1`);
          return;
        }
        toast.error(t("checkout.submitUnknown"));
      } else {
        // 后端开关未开 / 旧端点拒绝 / 超时：真实报错，不写死假成功。
        toast.error(res.error?.message || t("checkout.submitFailed"));
      }
    } catch (error) {
      console.error("Mercari proxy-submit failed:", error);
      toast.error(t("checkout.submitUnknown"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 渲染 ----

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">{t("checkout.title")}</h1>
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

  if (loadError || !item) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold mb-4">
          {loadError || t("checkout.loadFailed")}
        </h1>
        <Button variant="outline" onClick={() => router.back()}>
          {t("emptyBack")}
        </Button>
      </div>
    );
  }

  // 支付面板（二维码形态）
  if (payment) {
    const orderId = pickOrderId(payment);
    const qrcodeUrl = pickQrcodeUrl(payment);
    const payUrl = pickPayUrl(payment);
    const amount = payment.amount ?? item.price;
    const amountRmb = pickAmountRmb(payment) ?? item.price_rmb;
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-center">
              {t("checkout.paymentTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("checkout.paymentAmount")}
              </span>
              <span className="font-semibold">{formatJpy(amount)}</span>
            </div>
            {amountRmb !== undefined && amountRmb !== null && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("checkout.paymentAmountRmb")}</span>
                <span>
                  {t("approx")}
                  {formatRmb(amountRmb)}
                  {t("cny")}
                </span>
              </div>
            )}
            <Separator />
            {qrcodeUrl ? (
              <div className="flex flex-col items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrcodeUrl}
                  alt={t("checkout.qrAlt")}
                  className="w-56 h-56 object-contain border rounded-lg bg-white"
                />
                <p className="text-xs text-muted-foreground text-center">
                  {t("checkout.scanToPay")}
                </p>
              </div>
            ) : payUrl ? (
              <Button
                className="w-full"
                onClick={() => {
                  window.location.href = payUrl;
                }}
              >
                {t("checkout.openPaymentPage")}
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground text-center">
              {t("checkout.paymentInProgress")}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (orderId) {
                  router.push(`/${lang}/orders/${orderId}?poll=1`);
                } else {
                  router.push(`/${lang}/orders`);
                }
              }}
            >
              {t("checkout.paidGoToOrder")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedVaCount = VALUE_ADDED_OPTIONS.filter(
    (o) => selectedValues[o.key],
  ).length;
  // 国际运费、增值服务费均为到仓后实际产生，下单时不计入应付；应付=商品价格（+后端按快照锁定的手续费，由后端 amount 为准）。
  const totalDue = item.price;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{t("checkout.title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左列：到仓说明 + 商品 + 增值服务 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 到仓说明（代购流程：先入日本仓，转运时再填收货地址） */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {t("checkout.sectionShipping")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground leading-relaxed">
                {t("checkout.warehouseNotice")}
              </div>
            </CardContent>
          </Card>

          {/* 商品信息 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {t("checkout.sectionItem")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {item.imgurls && item.imgurls[0] ? (
                  <Image
                    src={item.imgurls[0]}
                    alt={item.goods_name}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded border"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                    {t("noImage")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-clamp-2">
                    {item.goods_name}
                  </div>
                  <div className="mt-1">
                    <Badge className="bg-red-500 text-white text-xs">
                      Mercari
                    </Badge>
                  </div>
                </div>
                <div className="text-sm font-medium whitespace-nowrap">
                  {formatJpy(item.price)}
                </div>
              </div>
              {isSoldOut && (
                <p className="mt-3 text-sm text-red-500">
                  {t("checkout.soldOut")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 增值服务 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {t("checkout.sectionValueAdded")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {VALUE_ADDED_OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={!!selectedValues[opt.key]}
                    onChange={(e) =>
                      setSelectedValues((prev) => ({
                        ...prev,
                        [opt.key]: e.target.checked,
                      }))
                    }
                  />
                  <span>{t(`checkout.${opt.labelKey}`)}</span>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">
                {t("checkout.valueAddedNote")}
              </p>
            </CardContent>
          </Card>

          {/* 备注 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {t("checkout.buyerMessage")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="buyerMessage" className="sr-only">
                {t("checkout.buyerMessage")}
              </Label>
              <Input
                id="buyerMessage"
                placeholder={t("checkout.buyerMessagePlaceholder")}
                value={buyerMessage}
                onChange={(e) => setBuyerMessage(e.target.value)}
                maxLength={200}
              />
            </CardContent>
          </Card>
        </div>

        {/* 右列：费用明细 + 支付 */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("checkout.summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.itemPrice")}
                  </span>
                  <span>{formatJpy(item.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.serviceFee")}
                  </span>
                  <span className="text-muted-foreground">
                    {t("serviceFeeValue")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.internationalShipping")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t("checkout.internationalShippingNote")}
                  </span>
                </div>
                {selectedVaCount > 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t("checkout.sectionValueAdded")}</span>
                    <span>x{selectedVaCount}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-base">
                <span>{t("checkout.totalDue")}</span>
                <span>{formatJpy(totalDue)}</span>
              </div>

              {item.price_rmb !== undefined && item.price_rmb !== null && (
                <div className="flex justify-end text-xs text-muted-foreground -mt-1">
                  <span>
                    {t("approx")}
                    {formatRmb(item.price_rmb)}
                    {t("cny")}
                  </span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {t("checkout.fullPaymentNote")}
              </p>

              <Button
                className="w-full mt-2 bg-orange-500 hover:bg-orange-600"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting || isSoldOut}
              >
                {submitting ? t("checkout.submitting") : t("checkout.payNow")}
              </Button>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t("checkout.lockNote")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
