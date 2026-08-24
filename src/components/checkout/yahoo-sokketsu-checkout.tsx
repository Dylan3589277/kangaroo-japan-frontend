"use client";

import { loginPathWithNext } from "@/lib/login-redirect";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  type YahooProxySubmitResult,
  type YahooQuote,
} from "@/lib/api";
import { normalizeProduct, type NormalizedProduct, type ProductLike } from "@/lib/product-utils";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type YahooItem = NormalizedProduct<ProductLike>;

// 真实增值服务名称按 id 映射 i18n key（与 Mercari 报价共用同一套后台服务表）。
const VALUE_ADDED_LABEL_KEYS: Record<number, string> = {
  5: "vaMissingCheck",
  6: "vaInboundPhoto",
};

// 金额一律 JPY 整数显示，不除以 100
function formatJpy(amount: number): string {
  return `¥${Math.round(amount).toLocaleString()}`;
}

function formatRmb(amount: number): string {
  return `¥${Number(amount).toFixed(2)}`;
}

// 二维码内容判定：只有真 http(s) URL 才允许跳转；NewAge 收银码是二维码内容（非网址），必须渲染成码。
function isHttpUrl(value?: string | null): value is string {
  return !!value && /^https?:\/\//i.test(value);
}

function pickAmountRmb(r: YahooProxySubmitResult): number | undefined {
  return r.amountRmb ?? r.amount_rmb;
}

function pickOrderId(r: YahooProxySubmitResult): string | undefined {
  return r.orderId ?? r.order_id;
}

function pickPayUrl(r: YahooProxySubmitResult): string | undefined {
  return r.payUrl ?? r.pay_url;
}

function pickQrcodeUrl(r: YahooProxySubmitResult): string | undefined {
  return r.qrcodeUrl ?? r.qrcode_url;
}

// Yahoo 一口价（ヤフオク 即決）结算页。照抄 mercari-checkout.tsx 的结构与费用口径，
// 仅换调 getYahooQuote/yahooProxySubmit + 文案换成雅虎拍卖。当前只做经典（zh）布局，
// 无 en/TCG 深色分支——雅虎一口价是客服 H5 面向 zh 客户的功能，未涉及 TCG 站。
export default function YahooSokketsuCheckout() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";
  const goodsNo = searchParams.get("id") || "";
  // 复用 mercari 命名空间的通用结算文案（配送说明/增值服务/费用明细等均为平台无关文案，
  // 仅个别提到 Mercari 的字符串在下方以字面量覆盖，避免为一个功能新增 8 语言 json）。
  const t = useTranslations("mercari");
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [item, setItem] = useState<YahooItem | null>(null);
  // 后端权威报价：商品价/手续费/增值服务列表均以此为准。
  const [quote, setQuote] = useState<YahooQuote | null>(null);
  const [selectedValues, setSelectedValues] = useState<Record<number, boolean>>(
    {},
  );
  const [buyerMessage, setBuyerMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [payment, setPayment] = useState<YahooProxySubmitResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setQuoteError(null);
    try {
      // 代购流程：下单不收地址，故只拉商品详情（旧端 ydetail，展示用）+ 后端权威报价。
      const [detailRes, quoteRes] = await Promise.all([
        api.getLegacyProductDetail(goodsNo, lang, "yahoo"),
        api.getYahooQuote(goodsNo),
      ]);

      if (detailRes.success && detailRes.data) {
        setItem(normalizeProduct(detailRes.data as ProductLike));
      } else {
        setLoadError(t("checkout.loadFailed"));
      }

      // 报价是金额唯一权威来源；失败则置 quoteError，下方禁用提交。
      if (quoteRes.success && quoteRes.data) {
        setQuote(quoteRes.data);
      } else {
        setQuoteError(quoteRes.error?.message || t("checkout.quoteFailed"));
      }
    } catch (error) {
      console.error("Failed to load Yahoo sokketsu checkout:", error);
      setLoadError(t("checkout.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [goodsNo, t, lang]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(loginPathWithNext(lang));
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

  // 提交时把勾选的增值服务【数字 id】以逗号拼接（如 "5,6"），交后端。
  const serializeValues = (): string => {
    const ids = quote
      ? quote.valueAdded
          .filter((va) => selectedValues[va.id])
          .map((va) => String(va.id))
      : [];
    return ids.join(",");
  };

  const handleSubmit = async () => {
    if (!item || isSoldOut) {
      toast.error(t("checkout.soldOut"));
      return;
    }
    if (!quote) {
      // 没有权威报价绝不下单（金额不可信）。
      toast.error(quoteError || t("checkout.quoteFailed"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.yahooProxySubmit({
        goodsNo,
        values: serializeValues(),
        buyerMessage: buyerMessage || undefined,
      });

      if (res.success && res.data) {
        const result = res.data;
        const orderId = pickOrderId(result);
        const payUrl = pickPayUrl(result);
        const qrcodeUrl = pickQrcodeUrl(result);

        // 支付凭证两种形态：
        //  1) qrcodeUrl 是 NewAge 二维码【内容】（非网址）——渲染成二维码让用户扫码付。
        //  2) payUrl 只有在是真 http(s) URL 时才跳转（NewAge 收银台网页）。
        if (qrcodeUrl) {
          setPayment(result);
          return;
        }
        if (isHttpUrl(payUrl)) {
          setPayment(result);
          window.location.href = payUrl;
          return;
        }
        // 没有可用支付凭证：下单可能已建，引导去我的订单，不伪装成功。
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
      console.error("Yahoo proxy-submit failed:", error);
      toast.error(t("checkout.submitUnknown"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 渲染 ----

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">雅虎拍卖 一口价结算</h1>
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
    // 金额以后端返回的权威 amount/amountRmb 为准。
    const amount = payment.amount ?? quote?.amountJpy ?? item.priceJpy;
    const amountRmb = pickAmountRmb(payment) ?? quote?.amountRmb;
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
                <div className="border rounded-lg bg-white p-3">
                  <QRCodeSVG
                    value={qrcodeUrl}
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
            ) : isHttpUrl(payUrl) ? (
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

  // 金额一律以后端权威报价为准（priceJpy/feeJpy/amountJpy/valueAdded，手续费动态）。
  const valueAdded = quote?.valueAdded ?? [];
  const selectedVaTotal = valueAdded
    .filter((va) => selectedValues[va.id])
    .reduce((sum, va) => sum + va.priceJpy, 0);
  const totalDue = quote ? quote.amountJpy + selectedVaTotal : 0;
  // 展示用商品价/人民币价：有报价用报价，否则退回详情页（仅展示，禁止据此下单）。
  const displayPriceJpy = quote?.priceJpy ?? item.priceJpy;
  const displayPriceRmb = quote?.amountRmb ?? item.priceCny;
  const canSubmit = !!quote && !quoteError && !isSoldOut && !submitting;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">雅虎拍卖 一口价结算</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左列：到仓说明 + 商品 + 增值服务 */}
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

          {/* 商品信息 */}
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
                    <Badge className="bg-red-600 text-white text-xs">
                      雅虎拍卖 一口价
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

          {/* 增值服务（真实选项，来自后端报价） */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {t("checkout.sectionValueAdded")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {valueAdded.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {quoteError
                    ? t("checkout.quoteFailed")
                    : t("checkout.noValueAdded")}
                </p>
              ) : (
                valueAdded.map((va) => {
                  const labelKey = VALUE_ADDED_LABEL_KEYS[va.id];
                  const label = labelKey ? t(`checkout.${labelKey}`) : va.name;
                  return (
                    <label
                      key={va.id}
                      className="flex items-center justify-between gap-3 text-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={!!selectedValues[va.id]}
                          onChange={(e) =>
                            setSelectedValues((prev) => ({
                              ...prev,
                              [va.id]: e.target.checked,
                            }))
                          }
                        />
                        <span>{label}</span>
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatJpy(va.priceJpy)}
                      </span>
                    </label>
                  );
                })
              )}
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
              {quoteError ? (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-600">
                  {quoteError}
                </div>
              ) : (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("checkout.itemPrice")}
                      </span>
                      <span>{formatJpy(displayPriceJpy)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("checkout.serviceFee")}
                      </span>
                      <span>{formatJpy(quote?.feeJpy ?? 0)}</span>
                    </div>
                    {valueAdded
                      .filter((va) => selectedValues[va.id])
                      .map((va) => {
                        const labelKey = VALUE_ADDED_LABEL_KEYS[va.id];
                        const label = labelKey
                          ? t(`checkout.${labelKey}`)
                          : va.name;
                        return (
                          <div
                            key={va.id}
                            className="flex justify-between text-muted-foreground"
                          >
                            <span className="truncate pr-2">{label}</span>
                            <span className="whitespace-nowrap">
                              {formatJpy(va.priceJpy)}
                            </span>
                          </div>
                        );
                      })}
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
                    <span>{formatJpy(totalDue)}</span>
                  </div>

                  {displayPriceRmb !== undefined && displayPriceRmb !== null && (
                    <div className="flex justify-end text-xs text-muted-foreground -mt-1">
                      <span>
                        {t("approx")}
                        {formatRmb(displayPriceRmb)}
                        {t("cny")}
                      </span>
                    </div>
                  )}
                </>
              )}

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
                雅虎拍卖一口价为先到先得，付款成功后才锁定购买；若付款前被他人抢先购走将自动退款。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
