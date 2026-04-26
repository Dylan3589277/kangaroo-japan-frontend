"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface YahooSellerInfo {
  id: string;
  name: string;
  photo_url?: string;
  score?: number;
  good_rate?: number;
  region?: string;
  num_sell_items?: number;
  num_ratings?: number;
}

interface YahooDetail {
  goods_no: string;
  goods_name: string;
  bid_price: number;
  fastprice?: number;
  price_rmb: number;
  bid_num: number;
  left_timestamp?: number;
  remain_time?: string;
  rate: number;
  description: string;
  content: string;
  imgurls: string[];
  status: string;
  url: string;
  collect: boolean;
  labels?: string[];
  seller_info?: YahooSellerInfo;
  extras?: { name: string; value: string }[];
}

// 倒计时 hook
function useCountdown(targetTimestamp?: number) {
  const [remaining, setRemaining] = useState<string>("");

  useEffect(() => {
    if (!targetTimestamp) return;

    const updateRemaining = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = targetTimestamp - now;
      if (diff <= 0) {
        setRemaining("已结束");
        return;
      }
      const days = Math.floor(diff / 86400);
      const hours = Math.floor((diff % 86400) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      if (days > 0) {
        setRemaining(`${days}天 ${hours}小时 ${minutes}分 ${seconds}秒`);
      } else if (hours > 0) {
        setRemaining(`${hours}小时 ${minutes}分 ${seconds}秒`);
      } else if (minutes > 0) {
        setRemaining(`${minutes}分 ${seconds}秒`);
      } else {
        setRemaining(`${seconds}秒`);
      }
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);
    return () => clearInterval(timer);
  }, [targetTimestamp]);

  return remaining;
}

export default function YahooDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const id = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const t = useTranslations('yahoo');

  const [detail, setDetail] = useState<YahooDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [tabIndex, setTabIndex] = useState<"description" | "shopping-info">("description");
  const [copied, setCopied] = useState(false);
  const [isCollected, setIsCollected] = useState(false);
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [bidAgreed, setBidAgreed] = useState(false);
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState("");
  const [bidHistoryOpen, setBidHistoryOpen] = useState(false);
  const [bidHistory, setBidHistory] = useState<any[]>([]);
  const [bidHistoryLoading, setBidHistoryLoading] = useState(false);

  const countdown = useCountdown(detail?.left_timestamp);

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.request(`/yahoo/goods/${id}`);
      if (res.success && res.data) {
        const data = res.data as any;
        const d = data.detail || data.data || data;
        setDetail(d);
        setIsCollected(d.collect || false);
      }
    } catch (error) {
      console.error("Failed to fetch Yahoo detail:", error);
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
      const res = await api.request("/users/docollect", {
        method: "POST",
        body: { goods_no: id, shop: "yahoo" },
      });
      if (res.success) {
        setIsCollected(!isCollected);
      }
    } catch {
      // ignore
    }
  };

  const openKefu = () => {
    if (detail?.url) {
      navigator.clipboard.writeText(detail.url);
    }
    router.push(`/${lang}/contact?type=yahoo&id=${id}`);
  };

  const handleBid = async () => {
    if (!isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }

    if (!bidAmount || Number(bidAmount) <= 0) {
      setBidError(t('validBidAmount'));
      return;
    }
    if (!bidAgreed) {
      setBidError(t('agreeBidTerms'));
      return;
    }

    setBidLoading(true);
    setBidError("");
    try {
      const res = await api.request("/yahoo/bid", {
        method: "POST",
        body: { goodsNo: id, money: Number(bidAmount) },
      });
      if (res.success) {
        setBidDialogOpen(false);
        setBidAmount("");
        setBidAgreed(false);
        alert(t('bidSuccess'));
        fetchDetail();
      } else {
        setBidError(res.message || res.error?.message || t('bidFailed'));
      }
    } catch (error: any) {
      setBidError(error.message || t('bidFailed'));
    } finally {
      setBidLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!detail?.description && !detail?.content) return;
    const textToTranslate = detail.description || detail.content || "";
    try {
      const res = await api.request("/translate/jp2zh", {
        method: "POST",
        body: { src: textToTranslate },
      });
      if (res.success && res.data) {
        const translated = (res.data as any).translated_text || (res.data as any).text || (res.data as any).result || "";
        if (translated) {
          alert(translated);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleBuyout = () => {
    if (!isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    router.push(`/${lang}/checkout?type=yahoo&id=${id}`);
  };

  const isEnded = detail?.status === "sold_out" || detail?.status === "end";

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

  const handleBidClick = () => {
    if (!isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    const minBid = detail.bid_price ? detail.bid_price + 1 : 1;
    setBidAmount(String(minBid));
    setBidError("");
    setBidAgreed(false);
    setBidDialogOpen(true);
  };

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
            <Link href="/yahoo" className="hover:text-primary">
              Yahoo{t('auctions')}
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
            {/* Status Badge */}
            {isEnded && (
              <Badge variant="destructive" className="absolute top-4 left-4 text-sm px-3 py-1">
                {t('ended')}
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

          {/* Labels */}
          {detail.labels && detail.labels.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {detail.labels.map((label, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="bg-orange-50 rounded-lg p-6 mb-6">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-orange-500">
                ¥{Number(detail.bid_price).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('yen')}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {t('approx')}¥{Number(detail.price_rmb).toFixed(2)}
              {t('cny')}
            </div>
            {/* Buyout Price */}
            {detail.fastprice && Number(detail.fastprice) > 0 && (
              <div className="flex items-baseline gap-2 mt-2 pt-2 border-t border-orange-200">
                <span className="text-sm text-muted-foreground">
                  {t('buyout')}:
                </span>
                <span className="text-xl font-bold text-orange-600">
                  ¥{Number(detail.fastprice).toLocaleString()}
                </span>
              </div>
            )}
            {/* Exchange Rate */}
            <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-orange-200">
              {t('currentRate')}: 1日元=0.047人民币
            </div>
          </div>

          {/* Bid Info */}
          <div className="flex items-center gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">
                {t('bidCount')}:
              </div>
              <button
                onClick={() => {
                  setBidHistoryOpen(!bidHistoryOpen);
                  if (!bidHistoryOpen && bidHistory.length === 0) {
                    setBidHistoryLoading(true);
                    api.request(`/yahoo/bid/history/${id}`).then((res) => {
                      if (res.success && res.data) {
                        const data = res.data as any;
                        setBidHistory(data.list || data.bids || data.data || []);
                      }
                    }).finally(() => setBidHistoryLoading(false));
                  }
                }}
                className="text-lg font-bold text-primary hover:underline cursor-pointer"
              >
                {detail.bid_num ?? 0} {t('bidNum')}
              </button>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">
                {t('timeLeft')}:
              </div>
              <div className={`text-lg font-bold ${countdown === "已结束" || countdown === "Ended" ? "text-red-500" : "text-orange-500"}`}>
                {countdown || detail.remain_time || t('ended')}
              </div>
            </div>
          </div>

          {/* Bid History */}
          {bidHistoryOpen && (
            <Card className="p-4 mb-4">
              <h4 className="text-sm font-semibold mb-3">
                {t('bidHistory')}
              </h4>
              {bidHistoryLoading ? (
                <div className="text-sm text-muted-foreground py-2">
                  {t('loading')}
                </div>
              ) : bidHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  {t('noBidHistory')}
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {bidHistory.map((bid: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-muted last:border-0">
                      <span className="text-muted-foreground">
                        {bid.bidder || bid.user_name || `User #${bid.user_id || idx + 1}`}
                      </span>
                      <span className="font-medium">
                        ¥{Number(bid.price || bid.amount || 0).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {bid.time || bid.created_at || ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Seller Info */}
          {detail.seller_info && (
            <div
              className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg mb-6 cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => {
                if (detail.seller_info?.id) {
                  router.push(`/${lang}/yahoo/seller/${detail.seller_info.id}`);
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
                  {detail.seller_info.region && (
                    <span>{detail.seller_info.region}</span>
                  )}
                  {detail.seller_info.score !== undefined && (
                    <span>
                      {t('score')}: {detail.seller_info.score}
                    </span>
                  )}
                  {detail.seller_info.good_rate !== undefined && (
                    <span>
                      {t('goodRate')}: {detail.seller_info.good_rate}%
                    </span>
                  )}
                </div>
              </div>
              <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}

          {/* Extra Info */}
          {detail.extras && detail.extras.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              {detail.extras.slice(0, 6).map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground min-w-[60px]">{row.name}:</span>
                  <span className="font-medium truncate">{row.value}</span>
                </div>
              ))}
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
                <span className="font-medium">Yahoo {t('auctions')}</span>
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
            {t('details')}
          </TabsTrigger>
          <TabsTrigger value="shopping-info">
            {t('shoppingInfoTitle')}
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
                onClick={handleTranslate}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m0 4a8 8 0 01-8-8m0 0h16M5 19l2-4m0 0l2-4m-2 4l-2-4m2 4l2 4m6-8l-2 4m0 0l2 4m-2-4h-4m0 0l-2-4" />
                </svg>
                <span className="text-xs">{t('translate')}</span>
              </Button>
            </div>
            <div className="flex gap-2">
              {/* 出价竞拍 Button */}
              {!isEnded && (
                <Button
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                  onClick={handleBidClick}
                >
                  {t('placeBid')}
                </Button>
              )}
              {/* 一口价购买 Button */}
              {detail.fastprice && Number(detail.fastprice) > 0 && !isEnded && (
                <Button
                  variant="default"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={handleBuyout}
                >
                  {t('buyNow')}
                </Button>
              )}
              {isEnded && (
                <Button variant="secondary" disabled>
                  {t('ended')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bid Dialog */}
      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('bidDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('bidDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Price Display */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {t('currentPrice')}:
              </span>
              <span className="text-lg font-bold text-orange-500">
                ¥{Number(detail.bid_price).toLocaleString()}
              </span>
            </div>

            {/* Bid Input */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t('yourBidJpy')}
              </label>
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => {
                  setBidAmount(e.target.value);
                  setBidError("");
                }}
                placeholder={t('enterBidAmount')}
                min={detail.bid_price ? detail.bid_price + 1 : 1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('minBid')}: ¥{((detail.bid_price || 0) + 1).toLocaleString()}
              </p>
            </div>

            {/* Agreement */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={bidAgreed}
                onChange={(e) => {
                  setBidAgreed(e.target.checked);
                  setBidError("");
                }}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground">
                {t('bidConfirmNote')}
              </span>
            </label>

            {/* Error Message */}
            {bidError && (
              <p className="text-sm text-red-500">{bidError}</p>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setBidDialogOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="default"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleBid}
              disabled={bidLoading}
            >
              {bidLoading
                ? t('submitting')
                : t('confirmBid')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
