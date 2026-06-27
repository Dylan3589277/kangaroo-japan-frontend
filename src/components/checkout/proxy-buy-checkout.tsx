"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/lib/api";
import { getRakumaDetail, getRakumaQuote } from "@/lib/api/rakuma";
import type {
  MarketplaceItem,
  RakumaQuote,
  RakumaOptionalService,
} from "@/lib/api/rakuma";
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
  cardmuseum: "Card Museum",
  toretoku: "トレトク",
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

/**
 * 增值服务勾选 key：与智能客服 h5 报价卡同口径（svc.code || svc.label || `svc-${i}`），
 * 保证渲染、合计、收集三处用同一把 key（绝不单用数组下标，防错位）。
 */
function serviceKey(svc: RakumaOptionalService, index: number): string {
  return svc.code || svc.label || `svc-${index}`;
}

/**
 * 收集买家勾选**且有数字 id** 的增值服务 id，逗号拼成机读串（如 "5,6"）。
 * 与后端 createOrder 的 value_added / 老端 proxysubmitv2 的 values 同契约（逗号数字串）。
 * 无勾选或勾选项均无 id → 返回 ""（空串则上层不传该字段，向后兼容零回归）。
 */
function collectSelectedServiceIds(
  services: RakumaOptionalService[] | undefined,
  checkedMap: Record<string, boolean>,
): string {
  if (!services || services.length === 0) return "";
  const ids: string[] = [];
  services.forEach((svc, i) => {
    const key = serviceKey(svc, i);
    if (checkedMap[key] && svc.id !== undefined) ids.push(String(svc.id));
  });
  return ids.join(",");
}

/**
 * 已勾选增值服务费合计（JPY 整数）：仅前端展示用，随勾选实时重算。
 * 权威金额仍以后端建单时按勾选 id 重算为准（老后台 st_value_added 权威收费）。
 */
function sumSelectedServiceFeeJpy(
  services: RakumaOptionalService[] | undefined,
  checkedMap: Record<string, boolean>,
): number {
  if (!services || services.length === 0) return 0;
  let total = 0;
  services.forEach((svc, i) => {
    const key = serviceKey(svc, i);
    if (checkedMap[key] && typeof svc.fee_jpy === "number") total += svc.fee_jpy;
  });
  return total;
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
  // 增值服务勾选状态（key = serviceKey）。仅 zh 报价携带 optional_services 时渲染/收集。
  const [serviceSelections, setServiceSelections] = useState<
    Record<string, boolean>
  >({});
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
      // 增值服务勾选 id 串（仅 zh；en/TCG 无增值服务概念）。空串则不传该字段，
      // 后端不向老端发 values，现有自助下单流零回归。后端按 id 查表权威收费。
      const valueAddedIds = isEn
        ? ""
        : collectSelectedServiceIds(
            quote?.optional_services,
            serviceSelections,
          );

      // 1) 建单：后端重算权威价、落库人工履约订单（绝不发金额）。
      const orderRes = await api.proxyBuyCreateOrder({
        platform,
        goodsNo,
        tcg: isEn,
        buyerMessage: buyerMessage || undefined,
        valueAddedIds: valueAddedIds || undefined,
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

  // 可选增值服务（仅 zh 报价携带；en/TCG 无此概念故不渲染）。缺省/空即不渲染（零回归）。
  const optionalServices =
    !isEn && quote?.optional_services && quote.optional_services.length > 0
      ? quote.optional_services
      : undefined;
  // 已勾选增值服务费（JPY 整数，仅前端展示；权威以后端建单按勾选 id 重算为准）。
  const selectedServiceFeeJpy = sumSelectedServiceFeeJpy(
    optionalServices,
    serviceSelections,
  );

  // 展示金额：以报价为参考（最终以后端建单权威价为准）。
  // zh 勾选增值服务时把已选服务费并进展示合计，让买家看见价格变化；en 不含增值服务。
  const displayPriceJpy = quote?.priceJpy ?? item.price_jpy;
  const displayAmountJpy =
    (quote?.amountJpy ?? item.price_jpy) + selectedServiceFeeJpy;
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

          {/* 可选增值服务（仅 zh 报价携带 optional_services 时渲染；en/TCG 不渲染）。
              勾选实时并入展示合计；建单时把勾选数字 id 透传后端，老后台按 id 权威收费。 */}
          {optionalServices ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {t("checkout.sectionValueAdded")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="space-y-2"
                  data-testid="proxy-buy-optional-services"
                >
                  {optionalServices.map((svc, i) => {
                    const key = serviceKey(svc, i);
                    const checked = Boolean(serviceSelections[key]);
                    return (
                      <label
                        key={key}
                        className="flex items-start gap-2 text-sm leading-5"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
                          checked={checked}
                          onChange={() =>
                            setServiceSelections((prev) => ({
                              ...prev,
                              [key]: !prev[key],
                            }))
                          }
                          data-testid={`proxy-buy-service-${key}`}
                        />
                        <span className="flex-1">
                          {svc.label || key}
                          {typeof svc.fee_jpy === "number" ? (
                            <span className="text-muted-foreground">
                              {" "}
                              {formatJpy(svc.fee_jpy)}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}
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
                {selectedServiceFeeJpy > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("checkout.valueAddedFee")}
                    </span>
                    <span>{formatJpy(selectedServiceFeeJpy)}</span>
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
