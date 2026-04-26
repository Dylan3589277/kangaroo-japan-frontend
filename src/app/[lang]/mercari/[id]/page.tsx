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

interface MercariDetail {
  goods_no: string;
  goods_name: string;
  price: number;
  price_rmb: number;
  rate: number;
  description: string;
  imgurls: string[];
  content: string;
  status: string;
  url: string;
  collect: boolean;
  cart: boolean;
  seller_info: {
    id: string;
    name: string;
    photo_url: string;
    score: number;
    num_sell_items: number;
    num_ratings?: number;
  };
  extras: { name: string; value: string }[];
  bid_count?: number;
  remain_time?: string;
}

export default function MercariDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const id = params.id as string;
  const t = useTranslations('mercari');

  const [detail, setDetail] = useState<MercariDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [tabIndex, setTabIndex] = useState<1 | 2>(1);
  const [copied, setCopied] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [cartNum, setCartNum] = useState(0);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.request(`/integrations/mercari/detail`, {
        method: "POST",
        body: { id },
      });
      if (res.success && res.data) {
        const data = res.data as any;
        // Handle different response shapes
        const d = data.detail || data.data || data;
        setDetail(d);
        setIsCollected(d.collect || false);
        setIsInCart(d.cart || false);
      }
    } catch (error) {
      console.error("Failed to fetch Mercari detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (detail?.url) {
      navigator.clipboard.writeText(detail.url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const copyName = () => {
    if (detail?.goods_name) {
      navigator.clipboard.writeText(detail.goods_name).then(() => {
        alert(t('copiedName'));
      });
    }
  };

  const toggleCollect = async () => {
    try {
      const res = await api.request(`/integrations/mercari/collect`, {
        method: "POST",
        body: { id, action: isCollected ? "remove" : "add" },
      });
      if (res.success) {
        setIsCollected(!isCollected);
      }
    } catch {
      // ignore
    }
  };

  const toggleCart = async () => {
    try {
      const res = await api.request(`/integrations/mercari/cart`, {
        method: "POST",
        body: { id, action: isInCart ? "remove" : "add" },
      });
      if (res.success) {
        setIsInCart(!isInCart);
        setCartNum((prev) => (isInCart ? Math.max(0, prev - 1) : prev + 1));
      }
    } catch {
      // ignore
    }
  };

  const openKefu = () => {
    if (detail?.url) {
      navigator.clipboard.writeText(detail.url);
    }
    // Navigate to customer service page
    router.push(`/${lang}/contact?type=mercari&id=${id}`);
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
        <h1 className="text-2xl font-bold mb-4">
          {t('emptyTitle')}
        </h1>
        <Button onClick={() => router.back()}>
          {t('emptyBack')}
        </Button>
      </div>
    );
  }

  const images = detail.imgurls || [];

  return (
    <div className="container mx-auto py-6 px-4 pb-32">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">
              {t('home')}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/mercari" className="hover:text-primary">
              Mercari
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground truncate max-w-[200px]">{detail.goods_name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden mb-4">
            {images.length > 0 ? (
              <Image
                src={images[selectedImage] || images[0]}
                alt={detail.goods_name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {t('noImage')}
              </div>
            )}
            {/* Sold Badge */}
            {(detail.status === "ITEM_STATUS_TRADING" || detail.status === "sold_out") && (
              <Badge variant="destructive" className="absolute top-4 left-4 text-sm px-3 py-1">
                {t('sold')}
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
                    selectedImage === idx ? "border-primary" : "border-transparent"
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${detail.goods_name} ${idx + 1}`}
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
          {/* Title (clickable to copy) */}
          <h1
            className="text-2xl font-bold mb-4 cursor-pointer hover:text-primary transition-colors"
            onClick={copyName}
            title={t('clickToCopy')}
          >
            {detail.goods_name}
          </h1>

          {/* Price */}
          <div className="bg-orange-50 rounded-lg p-6 mb-6">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-orange-500">
                ¥{Number(detail.price).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('yen')}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('approx')}¥{Number(detail.price_rmb).toFixed(2)}
              {t('cny')}
              {detail.rate && (
                <span className="ml-2">
                  ({t('rate')}: {detail.rate})
                </span>
              )}
            </div>
          </div>

          {/* Extra Info */}
          {detail.extras && detail.extras.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {detail.extras.slice(0, 4).map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground min-w-[60px]">{row.name}:</span>
                  <span className="font-medium truncate">{row.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Seller Info */}
          {detail.seller_info && (
            <div
              className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg mb-6 cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => {
                if (detail.seller_info?.id) {
                  router.push(`/${lang}/mercari/seller/${detail.seller_info.id}`);
                }
              }}
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {detail.seller_info.photo_url ? (
                  <Image
                    src={detail.seller_info.photo_url}
                    alt={detail.seller_info.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {detail.seller_info.name?.[0] || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{detail.seller_info.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>
                    {t('score')}: {detail.seller_info.score || "N/A"}
                  </span>
                  <span>
                    {t('items')}: {detail.seller_info.num_sell_items || 0}
                  </span>
                </div>
              </div>
              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}

          {/* Fee Details */}
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-semibold mb-3">
              {t('feeDetails')}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('source')}</span>
                <span className="font-medium">Mercari</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('domesticShipping')}</span>
                <span className="font-medium">{t('zeroYen')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('serviceFee')}</span>
                <span className="font-medium text-orange-500">
                  {t('serviceFeeValue')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('internationalShipping')}</span>
                <span className="font-medium">
                  {t('internationalShippingDesc')}
                </span>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied
                ? t('copied')
                : t('copyLink')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCollect}
              className={`gap-2 ${isCollected ? "text-red-500 border-red-200" : ""}`}
            >
              <svg className="w-4 h-4" fill={isCollected ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {isCollected
                ? t('favorited')
                : t('favorite')}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs: Description + Shopping Info */}
      <Tabs defaultValue="description" className="mb-12">
        <TabsList>
          <TabsTrigger value="description">
            {t('description')}
          </TabsTrigger>
          <TabsTrigger value="shopping-info">
            {t('shoppingInfo')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-4">
          <Card className="p-6">
            <div className="text-xs text-muted-foreground mb-4">
              {t('translationNote')}
            </div>
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold mb-2">
                {t('details')}
              </h3>
              <div
                className="whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: detail.content || detail.description || "" }}
              />
              {!detail.content && !detail.description && (
                <p className="text-muted-foreground">
                  {t('noDescription')}
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="shopping-info" className="mt-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('shoppingInfoTitle')}
            </h3>
            <div className="prose prose-sm max-w-none space-y-3">
              <p className="text-sm">
                {t('shoppingNote1')}
              </p>
              <p className="text-sm">
                {t('shoppingNote2')}
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={openKefu}
                className="flex-col gap-1 h-auto py-1 px-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 11-12.728 0 9 9 0 0112.728 0zM12 8v4m0 4h.01" />
                </svg>
                <span className="text-xs">{t('customerService')}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-col gap-1 h-auto py-1 px-3"
                onClick={() => router.push(`/${lang}/cart`)}
              >
                <div className="relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  {cartNum > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                      {cartNum}
                    </span>
                  )}
                </div>
                <span className="text-xs">{t('cart')}</span>
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={isInCart ? "secondary" : "outline"}
                onClick={toggleCart}
                disabled={detail.status === "sold_out" || detail.status === "ITEM_STATUS_TRADING"}
              >
                {isInCart
                  ? t('removeFromCart')
                  : t('addToCart')}
              </Button>
              <Button
                variant="default"
                className="bg-orange-500 hover:bg-orange-600"
                disabled={detail.status === "sold_out" || detail.status === "ITEM_STATUS_TRADING"}
                onClick={() => router.push(`/${lang}/checkout?type=mercari&id=${id}`)}
              >
                {detail.status === "sold_out" || detail.status === "ITEM_STATUS_TRADING"
                  ? t('sold')
                  : t('buyNow')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
