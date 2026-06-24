"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatLauncher } from "@/components/tcg/ChatProvider";
import { ImageLightbox } from "@/components/tcg/ImageLightbox";
import { getToretokuDetail, getToretokuQuote } from "@/lib/api/toretoku";
import type { MarketplaceItem } from "@/lib/api/toretoku";

/**
 * 经典版（浅色 + 橙红激安点缀）トレトク 商品详情页。
 * zh locale 渲染。来源显示「トレトク」，价格显人民币估算。
 * 数据接后端 /integrations/toretoku/detail + /toretoku/quote（tcg=false）。
 * 视觉与布局对齐 cardrush 经典版，主题点缀由红改橙红、平台标识为 トレトク。
 * i18n 复用 rakuma 命名空间（通用文案）。
 */
export function ToretokuDetailClassic() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const id = params.id as string;
  const t = useTranslations("rakuma");
  const { openWithProduct } = useChatLauncher();

  const [detail, setDetail] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeJpy, setFeeJpy] = useState<number | null>(null);
  const [amountRmb, setAmountRmb] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCollected, setIsCollected] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await getToretokuDetail(id);
        if (!active) return;
        if (res.success && res.data) {
          setDetail(res.data as MarketplaceItem);
        }
      } catch (error) {
        console.error("Failed to fetch Toretoku detail:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    const fetchFee = async () => {
      try {
        const res = await getToretokuQuote(id, { tcg: false });
        if (!active) return;
        if (res.success && res.data && typeof res.data.feeJpy === "number") {
          setFeeJpy(res.data.feeJpy);
          setAmountRmb(
            typeof res.data.amountRmb === "number" ? res.data.amountRmb : null,
          );
        } else {
          setFeeJpy(null);
          setAmountRmb(null);
        }
      } catch {
        setFeeJpy(null);
        setAmountRmb(null);
      }
    };

    void fetchDetail();
    void fetchFee();

    return () => {
      active = false;
    };
  }, [id]);

  const copyLink = () => {
    if (detail?.source_url) {
      navigator.clipboard.writeText(detail.source_url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const toggleCollect = async () => {
    try {
      const res = await api.request(`/integrations/toretoku/collect`, {
        method: "POST",
        body: { id, action: isCollected ? "remove" : "add" },
      });
      if (res.success) setIsCollected(!isCollected);
    } catch {
      // ignore
    }
  };

  // 网页代拍下单：加购与立即购买都进通用代拍结算（type=toretoku）。
  const goToCheckout = () => {
    router.push(`/${lang}/checkout?type=toretoku&id=${id}`);
  };

  const openKefu = () => {
    if (!detail) return;
    openWithProduct({
      title: detail.title,
      image: detail.images?.[0],
      priceJpy: Number(detail.price_jpy),
      platform: "mercari",
      href: `/${lang}/checkout?type=toretoku&id=${id}`,
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-4">{t("emptyTitle")}</h1>
        <Button onClick={() => router.back()}>{t("emptyBack")}</Button>
      </div>
    );
  }

  const images = detail.images || [];
  const soldOut = detail.status === "sold_out" || detail.status === "ITEM_STATUS_TRADING";

  return (
    <div className="container mx-auto py-6 px-4 pb-32 md:pb-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">
              {t("home")}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/toretoku" className="hover:text-primary">
              トレトク
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground truncate max-w-[200px]">{detail.title}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Image Gallery */}
        <div>
          <div className="group relative aspect-square bg-muted rounded-lg overflow-hidden mb-4">
            {images.length > 0 ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={t("designA.zoom.open")}
                className="absolute inset-0 cursor-zoom-in"
              >
                <Image
                  src={images[selectedImage] || images[0]}
                  alt={detail.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
                <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <circle cx="11" cy="11" r="7" strokeWidth={1.6} />
                    <path strokeLinecap="round" strokeWidth={1.6} d="m21 21-4.3-4.3M11 8v6M8 11h6" />
                  </svg>
                  {t("designA.zoom.open")}
                </span>
              </button>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {t("noImage")}
              </div>
            )}
            <span className="absolute top-4 left-4 inline-flex items-center rounded-md bg-gradient-to-r from-orange-500 to-red-600 px-2 py-0.5 text-[11px] font-bold tracking-wide text-white shadow-sm">
              トレトク
            </span>
            {soldOut && (
              <Badge variant="destructive" className="absolute top-4 right-4 text-sm px-3 py-1">
                {t("sold")}
              </Badge>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 ${
                    selectedImage === idx ? "border-orange-500" : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${detail.title} ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Item Info */}
        <div>
          <h1 className="text-2xl font-bold mb-4">{detail.title}</h1>

          {/* Price */}
          <div className="bg-orange-50 rounded-lg p-6 mb-6">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-orange-600">
                ¥{Number(detail.price_jpy).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">{t("yen")}</span>
            </div>
            {amountRmb !== null ? (
              <div className="text-sm text-muted-foreground">
                {t("approx")}¥{Number(amountRmb).toFixed(2)}
                {t("cny")}
                <span className="ml-1 text-xs">{t("amountRmbNote")}</span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t("amountRmbAtLogin")}
              </div>
            )}
          </div>

          {/* Seller Info */}
          {detail.seller && (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg mb-6">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {detail.seller.avatar_url ? (
                  <Image
                    src={detail.seller.avatar_url}
                    alt={detail.seller.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {detail.seller.name?.[0] || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{detail.seller.name}</p>
                {detail.seller.rating !== undefined && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>{t("score")}: {detail.seller.rating}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fee Details */}
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3">{t("feeDetails")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("source")}</span>
                <span className="font-medium">トレトク</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("domesticShipping")}</span>
                <span className="font-medium">{t("zeroYen")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("serviceFee")}</span>
                <span className="font-medium text-orange-600">
                  {feeJpy !== null
                    ? `¥${feeJpy.toLocaleString()}`
                    : t("serviceFeeAtCheckout")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("internationalShipping")}</span>
                <span className="font-medium">{t("internationalShippingDesc")}</span>
              </div>
            </div>
          </Card>

          {/* 次要操作 */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={copyLink} className="gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? t("copied") : t("copyLink")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCollect}
              className={`gap-2 ${isCollected ? "text-orange-500 border-orange-200" : ""}`}
            >
              <svg className="w-4 h-4" fill={isCollected ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isCollected ? t("favorited") : t("favorite")}
            </Button>
            <button
              type="button"
              onClick={openKefu}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {t("askThisItem")}
            </button>
          </div>

          {/* 主操作（桌面端内联） */}
          <div className="hidden gap-3 md:flex">
            <Button
              variant="outline"
              className="flex-1"
              onClick={goToCheckout}
              disabled={soldOut}
            >
              {t("addToCart")}
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
              disabled={soldOut}
              onClick={goToCheckout}
            >
              {soldOut ? t("sold") : t("buyNow")}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="description" className="mb-12">
        <TabsList>
          <TabsTrigger value="description">{t("description")}</TabsTrigger>
          <TabsTrigger value="shopping-info">{t("shoppingInfo")}</TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-4">
          <Card className="p-6">
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold mb-2">{t("details")}</h3>
              {Array.isArray(detail.additional_services) && detail.additional_services.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {detail.additional_services.map((svc, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                      {svc}
                    </span>
                  ))}
                </div>
              )}
              {detail.descriptionTranslated ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {detail.descriptionTranslated}
                </p>
              ) : detail.description ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {detail.description}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">{t("noDescription")}</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="shopping-info" className="mt-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">{t("shoppingInfoTitle")}</h3>
            <div className="prose prose-sm max-w-none space-y-3">
              <p className="text-sm">{t("shoppingNote1")}</p>
              <p className="text-sm">{t("shoppingNote2")}</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lightbox */}
      {images.length > 0 && (
        <ImageLightbox
          images={images}
          index={selectedImage}
          alt={detail.title}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setSelectedImage}
          labels={{
            close: t("designA.zoom.close"),
            prev: t("designA.zoom.prev"),
            next: t("designA.zoom.next"),
            zoomIn: t("designA.zoom.zoomIn"),
            zoomOut: t("designA.zoom.zoomOut"),
            reset: t("designA.zoom.reset"),
            hint: t("designA.zoom.hint"),
          }}
        />
      )}

      {/* 底部吸底（移动端） */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow-lg md:hidden">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto flex-col gap-1 px-3 py-1"
              onClick={() => router.push(`/${lang}/cart`)}
            >
              <div className="relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                </svg>
              </div>
              <span className="text-xs">{t("cart")}</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={goToCheckout}
              disabled={soldOut}
            >
              {t("addToCart")}
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:opacity-90"
              disabled={soldOut}
              onClick={goToCheckout}
            >
              {soldOut ? t("sold") : t("buyNow")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
