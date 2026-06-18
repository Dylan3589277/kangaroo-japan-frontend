"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import {
  api,
  type MercariProxySubmitResult,
  type MercariQuote,
} from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { spaceGrotesk } from "@/app/fonts";
import {
  MercariCheckoutTcgView,
  MercariPaymentTcgView,
} from "@/components/checkout/mercari-checkout-tcg";

interface MercariItem {
  goods_no: string;
  goods_name: string;
  price: number; // JPY 整数（网页抓的展示价，非权威；金额一律以后端 quote 为准）
  price_rmb?: number;
  rate?: number;
  imgurls?: string[];
  status?: string;
}

// 真实增值服务名称按 id 映射 i18n key（后端 quote.valueAdded[].name 兜底）：
//   id=5 错发漏发检查服务 ¥100；id=6 入库前拍照服务 ¥100。
const VALUE_ADDED_LABEL_KEYS: Record<number, string> = {
  5: "vaMissingCheck",
  6: "vaInboundPhoto",
};

// 金额一律 JPY 整数显示，不除以 100
function formatJpy(amount: number): string {
  return `¥${Math.round(amount).toLocaleString()}`;
}

// 人民币金额：保留旧端精度，沿用详情页 price_rmb 的展示（¥ 符号 + 两位小数）。
function formatRmb(amount: number): string {
  return `¥${Number(amount).toFixed(2)}`;
}

// 二维码内容判定：只有真 http(s) URL 才允许跳转；NewAge 收银码是二维码内容（非网址），必须渲染成码。
function isHttpUrl(value?: string | null): value is string {
  return !!value && /^https?:\/\//i.test(value);
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
  // en 走设计方向 A 深色呈现，其它语言保持现有渲染。仅影响视觉，业务逻辑共用。
  const isEn = lang === "en";
  const goodsNo = searchParams.get("id") || "";
  const t = useTranslations("mercari");
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [item, setItem] = useState<MercariItem | null>(null);
  // 后端权威报价：商品价/手续费/增值服务列表均以此为准。
  const [quote, setQuote] = useState<MercariQuote | null>(null);
  // 勾选的增值服务，按数字 id 记录（如 {5:true,6:true}）。
  const [selectedValues, setSelectedValues] = useState<Record<number, boolean>>(
    {},
  );
  const [buyerMessage, setBuyerMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 报价单独失败时，仍可展示商品但禁止下单（金额不可信）。
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 支付阶段状态
  const [payment, setPayment] = useState<MercariProxySubmitResult | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setQuoteError(null);
    try {
      // 代购流程：下单不收地址，故只拉商品详情（地址在后续转运/出库单再填）+ 后端权威报价。
      const [detailRes, quoteRes] = await Promise.all([
        api.request(`/integrations/mercari/detail`, {
          method: "POST",
          body: { id: goodsNo },
        }),
        api.getMercariQuote(goodsNo),
      ]);

      if (detailRes.success && detailRes.data) {
        const data = detailRes.data as Record<string, unknown>;
        const d = (data.detail || data.data || data) as MercariItem;
        setItem(d);
      } else {
        setLoadError(t("checkout.loadFailed"));
      }

      // 报价是金额唯一权威来源；失败则置 quoteError，下方禁用提交。
      if (quoteRes.success && quoteRes.data) {
        setQuote(quoteRes.data);
      } else {
        setQuoteError(
          quoteRes.error?.message || t("checkout.quoteFailed"),
        );
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

  // 提交时把勾选的增值服务【数字 id】以逗号拼接（如 "5,6"），交后端。
  const serializeValues = (): string => {
    const ids = quote
      ? quote.valueAdded
          .filter((va) => selectedValues[va.id])
          .map((va) => String(va.id))
      : [];
    // 报价卡勾了安心鉴定时,把 'anshin' 标记搭现有 values 字段透传(#2)：
    // 后端 submitCore 从 values 识别 'anshin'→服务端重读真实鉴定费(买家承担)→runner 结账页勾选。
    // 走 values 而非新字段,免改现代 NestJS 后端 DTO/转发(避免撞 L1/L2 的 src/mercari WIP)。
    const wantAnshin = (searchParams.get("services") || "")
      .split(",")
      .map((s) => s.trim())
      .includes("mercari_anshin_kantei");
    if (wantAnshin) ids.push("anshin");
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
      console.error("Mercari proxy-submit failed:", error);
      toast.error(t("checkout.submitUnknown"));
    } finally {
      setSubmitting(false);
    }
  };

  // ---- 渲染 ----

  if (authLoading || loading) {
    if (isEn) {
      return (
        <div
          className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
        >
          <div className="mx-auto max-w-5xl px-4 py-10">
            <div className="mb-8 h-8 w-56 animate-pulse rounded bg-white/[0.06]" />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]"
                  />
                ))}
              </div>
              <div className="h-56 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
            </div>
          </div>
        </div>
      );
    }
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
    if (isEn) {
      return (
        <div
          className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
        >
          <div className="mx-auto max-w-md px-4 py-20 text-center">
            <div className="mb-4 text-5xl">🔍</div>
            <h1 className="mb-5 font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-white">
              {loadError || t("checkout.loadFailed")}
            </h1>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.03] px-6 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
            >
              {t("emptyBack")}
            </button>
          </div>
        </div>
      );
    }
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
    const amount = payment.amount ?? quote?.amountJpy ?? item.price;
    const amountRmb = pickAmountRmb(payment) ?? quote?.amountRmb;
    // en 支付面板美元（含手续费）：从 quote 反推后台 USD 汇率 × 实付 amount(JPY)。
    // 汇率不可用则为 null（只显 JPY，不显错币）。
    const payUsdRate =
      quote &&
      typeof quote.amountUsd === "number" &&
      typeof quote.amountJpy === "number" &&
      quote.amountJpy > 0
        ? quote.amountUsd / quote.amountJpy
        : null;
    const amountUsd =
      payUsdRate !== null ? Math.round(amount * payUsdRate * 100) / 100 : null;
    if (isEn) {
      // 设计 A 深色支付面板：二维码/payUrl/轮询入口逻辑与默认版完全一致，只换皮。
      return (
        <MercariPaymentTcgView
          texts={{
            paymentTitle: t("checkout.paymentTitle"),
            paymentAmount: t("checkout.paymentAmount"),
            paymentAmountUsd: t("checkout.paymentAmountUsd"),
            scanToPayAlipay: t("checkout.scanToPayAlipay"),
            scanToPay: t("checkout.scanToPay"),
            qrAlt: t("checkout.qrAlt"),
            openPaymentPage: t("checkout.openPaymentPage"),
            paymentInProgress: t("checkout.paymentInProgress"),
            paidGoToOrder: t("checkout.paidGoToOrder"),
            approx: t("approx"),
            usd: t("usd"),
          }}
          amount={amount}
          amountUsd={amountUsd}
          qrcodeUrl={qrcodeUrl}
          payUrl={isHttpUrl(payUrl) ? payUrl : undefined}
          onOpenPayUrl={
            isHttpUrl(payUrl)
              ? () => {
                  window.location.href = payUrl;
                }
              : undefined
          }
          onGoToOrder={() => {
            if (orderId) {
              router.push(`/${lang}/orders/${orderId}?poll=1`);
            } else {
              router.push(`/${lang}/orders`);
            }
          }}
        />
      );
    }
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
                {/* NewAge 收银二维码内容（非网址），用 qrcode.react 编码成二维码图片展示，用户扫码付。 */}
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
  // 应付金额 = 后端权威应付(amountJpy=商品价+动态手续费) + 勾选的增值服务之和。
  const totalDue = quote ? quote.amountJpy + selectedVaTotal : 0;
  // 展示用商品价/人民币价：有报价用报价，否则退回详情页（仅展示，禁止据此下单）。
  const displayPriceJpy = quote?.priceJpy ?? item.price;
  const displayPriceRmb = quote?.amountRmb ?? item.price_rmb;
  // en 站美元：从后端 quote 的 amountUsd/amountJpy 反推后台 USD 汇率，再乘 totalDue(含手续费+增值)。
  // 这样 USD 与 JPY 同一口径(含手续费)且能覆盖前端勾选的增值服务。汇率不可用则为 null(只显 JPY)。
  const usdRate =
    quote &&
    typeof quote.amountUsd === "number" &&
    typeof quote.amountJpy === "number" &&
    quote.amountJpy > 0
      ? quote.amountUsd / quote.amountJpy
      : null;
  const totalDueUsd =
    usdRate !== null ? Math.round(totalDue * usdRate * 100) / 100 : null;
  const canSubmit = !!quote && !quoteError && !isSoldOut && !submitting;

  if (isEn) {
    // 设计 A 深色结算页：金额口径 / 增值勾选 / 提交回调全部沿用上方逻辑，只换视觉。
    const selectedVaList = valueAdded.filter((va) => selectedValues[va.id]);
    return (
      <MercariCheckoutTcgView
        texts={{
          title: t("checkout.title"),
          sectionShipping: t("checkout.sectionShipping"),
          warehouseNotice: t("checkout.warehouseNotice"),
          sectionItem: t("checkout.sectionItem"),
          sectionValueAdded: t("checkout.sectionValueAdded"),
          noValueAdded: t("checkout.noValueAdded"),
          quoteFailed: t("checkout.quoteFailed"),
          buyerMessage: t("checkout.buyerMessage"),
          buyerMessagePlaceholder: t("checkout.buyerMessagePlaceholder"),
          summary: t("checkout.summary"),
          itemPrice: t("checkout.itemPrice"),
          serviceFee: t("checkout.serviceFee"),
          internationalShipping: t("checkout.internationalShipping"),
          internationalShippingNote: t("checkout.internationalShippingNote"),
          totalDue: t("checkout.totalDue"),
          fullPaymentNote: t("checkout.fullPaymentNote"),
          payNow: t("checkout.payNow"),
          submitting: t("checkout.submitting"),
          lockNote: t("checkout.lockNote"),
          soldOut: t("checkout.soldOut"),
          noImage: t("noImage"),
          approx: t("approx"),
          usd: t("usd"),
        }}
        item={{ goods_name: item.goods_name, imgurls: item.imgurls }}
        quoteError={quoteError}
        isSoldOut={isSoldOut}
        valueAdded={valueAdded}
        selectedValues={selectedValues}
        onToggleValue={(id, checked) =>
          setSelectedValues((prev) => ({ ...prev, [id]: checked }))
        }
        valueAddedLabel={(va) => {
          const labelKey = VALUE_ADDED_LABEL_KEYS[va.id];
          return labelKey ? t(`checkout.${labelKey}`) : va.name;
        }}
        buyerMessage={buyerMessage}
        onBuyerMessageChange={setBuyerMessage}
        displayPriceJpy={displayPriceJpy}
        totalDueUsd={totalDueUsd}
        feeJpy={quote?.feeJpy ?? 0}
        selectedVaList={selectedVaList}
        totalDue={totalDue}
        canSubmit={canSubmit}
        submitting={submitting}
        onSubmit={handleSubmit}
      />
    );
  }

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
                  // 优先用本地化文案；后端无对应 key 时退回 quote 返回的 name。
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
                {t("checkout.lockNote")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
