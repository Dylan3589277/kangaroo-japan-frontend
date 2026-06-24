"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { getRakumaDetail, getRakumaQuote } from "@/lib/api/rakuma";
import type { MarketplaceItem, RakumaQuote } from "@/lib/api/rakuma";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/**
 * 通用「网页代拍」结算页（平台无关：rakuma / yahoofrima / paypay …）。
 * 由 /[lang]/checkout?type=<platform>&id=<goodsNo> 进入；照 type=mercari 那套做成通用：
 *   1) 拉详情（展示）+ 报价（展示，仅参考——金额最终由后端建单时服务端权威算定）；
 *   2) 建单（POST /proxy-buy/orders，后端重算权威价、落库人工履约订单，绝不信前端金额）；
 *   3) 发起收款：en（USD）→ Stripe 托管收银台跳转；zh（CNY）→ NewAge 二维码/跳转。
 * rakuma 等无自动买货——付款后人工代拍履约。
 */

const PLATFORM_LABELS: Record<string, string> = {
  rakuma: "Rakuma",
  yahoofrima: "Yahoo!フリマ",
  paypay: "PayPayフリマ",
  cardrush: "CardRush",
  torecacamp: "トレカキャンプ",
};

function formatJpy(amount: number): string {
  return `¥${Math.round(amount).toLocaleString()}`;
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function isHttpUrl(value?: string | null): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

/** 平台 → 详情/报价抓取（平台无关分派；新平台在此扩展）。 */
async function fetchDetailAndQuote(
  platform: string,
  goodsNo: string,
  isEn: boolean,
): Promise<{
  item: MarketplaceItem | null;
  quote: RakumaQuote | null;
  quoteError: string | null;
}> {
  if (platform === "rakuma") {
    const [detailRes, quoteRes] = await Promise.all([
      getRakumaDetail(goodsNo),
      getRakumaQuote(goodsNo, { tcg: isEn }),
    ]);
    const item = detailRes.success ? (detailRes.data ?? null) : null;
    const quote = quoteRes.success ? (quoteRes.data ?? null) : null;
    const quoteError = quoteRes.success
      ? null
      : (quoteRes.error?.message ?? "quote failed");
    return { item, quote, quoteError };
  }
  // 其它平台（yahoofrima 等）：详情走统一 integrations 端点，报价走通用 proxy-buy/quote。
  const detailRes = await api.request<MarketplaceItem>(
    `/integrations/${platform}/detail?id=${encodeURIComponent(goodsNo)}`,
  );
  const quoteRes = await api.request<RakumaQuote>(
    `/proxy-buy/quote?platform=${encodeURIComponent(
      platform,
    )}&goodsNo=${encodeURIComponent(goodsNo)}${isEn ? "&tcg=true" : ""}`,
  );
  const item = detailRes.success ? (detailRes.data ?? null) : null;
  const quote = quoteRes.success ? (quoteRes.data ?? null) : null;
  const quoteError = quoteRes.success
    ? null
    : (quoteRes.error?.message ?? "quote failed");
  return { item, quote, quoteError };
}

export default function ProxyBuyCheckout({ platform }: { platform: string }) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";
  const isEn = lang === "en";
  const goodsNo = searchParams.get("id") || "";
  const t = useTranslations("mercari");
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [quote, setQuote] = useState<RakumaQuote | null>(null);
  const [buyerMessage, setBuyerMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 支付阶段（zh NewAge 二维码/跳转）。
  const [pay, setPay] = useState<{
    orderId: string;
    amountJpy: number;
    payAmount?: number;
    payCurrency: string;
    payUrl?: string;
    qrcodeUrl?: string;
  } | null>(null);

  const platformLabel = PLATFORM_LABELS[platform] ?? platform;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setQuoteError(null);
    try {
      const { item: it, quote: q, quoteError: qe } = await fetchDetailAndQuote(
        platform,
        goodsNo,
        isEn,
      );
      if (it) {
        setItem(it);
      } else {
        setLoadError(t("checkout.loadFailed"));
      }
      if (q) {
        setQuote(q);
      } else {
        setQuoteError(qe || t("checkout.quoteFailed"));
      }
    } catch (error) {
      console.error("Failed to load proxy-buy checkout:", error);
      setLoadError(t("checkout.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [platform, goodsNo, isEn, t]);

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

  const isSoldOut = item?.status === "sold_out";

  const handleSubmit = async () => {
    if (!item || isSoldOut) {
      toast.error(t("checkout.soldOut"));
      return;
    }
    setSubmitting(true);
    try {
      // 1) 建单：后端重算权威价、落库人工履约订单（绝不发金额）。
      const orderRes = await api.proxyBuyCreateOrder({
        platform,
        goodsNo,
        tcg: isEn,
        buyerMessage: buyerMessage || undefined,
      });
      if (!orderRes.success || !orderRes.data) {
        toast.error(orderRes.error?.message || t("checkout.submitFailed"));
        return;
      }
      const order = orderRes.data;

      // 2) 发起收款：en → Stripe 跳转；zh → NewAge 二维码/跳转。
      if (isEn) {
        const sessionRes = await api.proxyBuyCreateStripeSession(
          order.orderId,
          "en",
        );
        if (sessionRes.success && isHttpUrl(sessionRes.data?.url)) {
          window.location.href = sessionRes.data.url;
          return;
        }
        // Stripe 不可用：订单已建，引导去我的订单（不伪装成功）。
        toast.warning(t("checkout.paymentUnavailable"));
        router.push(`/${lang}/orders/${order.orderId}?poll=1`);
        return;
      }

      const payRes = await api.proxyBuyCreateNewagePayment(order.orderId);
      if (payRes.success && payRes.data) {
        const { payUrl, qrcodeUrl } = payRes.data;
        if (qrcodeUrl) {
          setPay({
            orderId: order.orderId,
            amountJpy: order.amountJpy,
            payAmount: order.payAmount,
            payCurrency: order.payCurrency,
            qrcodeUrl,
          });
          return;
        }
        if (isHttpUrl(payUrl)) {
          window.location.href = payUrl;
          return;
        }
      }
      // 收款发起失败：订单已建，引导去我的订单。
      toast.warning(t("checkout.paymentUnavailable"));
      router.push(`/${lang}/orders/${order.orderId}?poll=1`);
    } catch (error) {
      console.error("Proxy-buy submit failed:", error);
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

  // zh NewAge 支付面板（二维码形态）。
  if (pay) {
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
              <span className="font-semibold">{formatJpy(pay.amountJpy)}</span>
            </div>
            <Separator />
            {pay.qrcodeUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="border rounded-lg bg-white p-3">
                  <QRCodeSVG
                    value={pay.qrcodeUrl}
                    size={208}
                    level="M"
                    aria-label={t("checkout.qrAlt")}
                  />
                </div>
                <p className="text-sm font-medium text-center">
                  {t("checkout.scanToPayAlipay")}
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  {t("checkout.scanToPay")}
                </p>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground text-center">
              {t("checkout.paymentInProgress")}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/${lang}/orders/${pay.orderId}?poll=1`)}
            >
              {t("checkout.paidGoToOrder")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 展示金额：以报价为参考（最终以后端建单权威价为准）。
  const displayPriceJpy = quote?.priceJpy ?? item.price_jpy;
  const displayAmountJpy = quote?.amountJpy ?? item.price_jpy;
  const displayUsd = isEn ? (quote?.amountUsd ?? null) : null;
  const canSubmit = !isSoldOut && !submitting;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">{t("checkout.title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左列：到仓说明 + 商品 + 备注 */}
        <div className="lg:col-span-2 space-y-6">
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {t("checkout.sectionItem")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {item.images && item.images[0] ? (
                  <Image
                    src={item.images[0]}
                    alt={item.title}
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
                    {item.title}
                  </div>
                  <div className="mt-1">
                    <Badge className="bg-orange-500 text-white text-xs">
                      {platformLabel}
                    </Badge>
                  </div>
                </div>
                <div className="text-sm font-medium whitespace-nowrap">
                  {formatJpy(displayPriceJpy)}
                </div>
              </div>
              {isSoldOut && (
                <p className="mt-3 text-sm text-red-500">
                  {t("checkout.soldOut")}
                </p>
              )}
            </CardContent>
          </Card>

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
              {quoteError ? (
                // 报价仅供展示，建单时后端会重算权威价；报价失败给一句温和提示，不阻断下单。
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700">
                  {t("checkout.quoteFailed")}
                </div>
              ) : null}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.itemPrice")}
                  </span>
                  <span>{formatJpy(displayPriceJpy)}</span>
                </div>
                {quote ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("checkout.serviceFee")}
                    </span>
                    <span>{formatJpy(quote.feeJpy)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("checkout.internationalShipping")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t("checkout.internationalShippingNote")}
                  </span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-semibold text-base">
                <span>{t("checkout.totalDue")}</span>
                <span>
                  {displayUsd !== null
                    ? formatUsd(displayUsd)
                    : formatJpy(displayAmountJpy)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {t("checkout.fullPaymentNote")}
              </p>

              <Button
                className="w-full mt-2 bg-orange-500 hover:bg-orange-600"
                size="lg"
                onClick={handleSubmit}
                disabled={!canSubmit}
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
