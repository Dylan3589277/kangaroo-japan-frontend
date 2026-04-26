"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
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

  const t = (zh: string, en: string, ja: string) => {
    if (lang === "en") return en;
    if (lang === "ja") return ja;
    return zh;
  };

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
        alert(t("已复制商品名称", "Copied item name", "商品名をコピーしました"));
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
      setBidError(t("请输入有效的出价金额", "Please enter a valid bid amount", "有効な入札額を入力してください"));
      return;
    }
    if (!bidAgreed) {
      setBidError(t("请阅读并同意出价协议", "Please read and agree to the bid terms", "入札条件を読み、同意してください"));
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
        alert(t("出价成功！", "Bid placed successfully!", "入札に成功しました！"));
        fetchDetail();
      } else {
        setBidError(res.message || res.error?.message || t("出价失败", "Bid failed", "入札に失敗しました"));
      }
    } catch (error: any) {
      setBidError(error.message || t("出价失败", "Bid failed", "入札に失敗しました"));
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
          {t("商品未找到", "Item Not Found", "商品が見つかりません")}
        </h1>
        <Button onClick={() => router.back()}>
          {t("返回", "Go Back", "戻る")}
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
              {t("首页", "Home", "ホーム")}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/yahoo" className="hover:text-primary">
              Yahoo{t("拍卖", " Auctions", "オークション")}
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
                {t("无图片", "No Image", "画像なし")}
              </div>
            )}
            {/* Status Badge */}
            {isEnded && (
              <Badge variant="destructive" className="absolute top-4 left-4 text-sm px-3 py-1">
                {t("已结束", "Ended", "終了")}
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
            title={t("点击复制商品名称", "Click to copy item name", "クリックして商品名をコピー")}
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
                {t("日元", "JPY", "円")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground mb-2">
              {t("约", "Approx. ", "約")}¥{Number(detail.price_rmb).toFixed(2)}
              {t("元人民币", " CNY", "元")}
            </div>
            {/* Buyout Price */}
            {detail.fastprice && Number(detail.fastprice) > 0 && (
              <div className="flex items-baseline gap-2 mt-2 pt-2 border-t border-orange-200">
                <span className="text-sm text-muted-foreground">
                  {t("一口价", "Buyout", "即決")}:
                </span>
                <span className="text-xl font-bold text-orange-600">
                  ¥{Number(detail.fastprice).toLocaleString()}
                </span>
              </div>
            )}
            {/* Exchange Rate */}
            <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-orange-200">
              {t("当前汇率", "Current Rate", "現在のレート")}: 1日元=0.047人民币
            </div>
          </div>

          {/* Bid Info */}
          <div className="flex items-center gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">
                {t("出价次数", "Bids", "入札数")}:
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
                {detail.bid_num ?? 0} {t("次", " bids", "回")}
              </button>
            </div>
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">
                {t("剩余时间", "Time Left", "残り時間")}:
              </div>
              <div className={`text-lg font-bold ${countdown === "已结束" || countdown === "Ended" ? "text-red-500" : "text-orange-500"}`}>
                {countdown || detail.remain_time || t("已结束", "Ended", "終了")}
              </div>
            </div>
          </div>

          {/* Bid History */}
          {bidHistoryOpen && (
            <Card className="p-4 mb-4">
              <h4 className="text-sm font-semibold mb-3">
                {t("出价历史", "Bid History", "入札履歴")}
              </h4>
              {bidHistoryLoading ? (
                <div className="text-sm text-muted-foreground py-2">
                  {t("加载中...", "Loading...", "読み込み中...")}
                </div>
              ) : bidHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  {t("暂无出价记录", "No bid history", "入札履歴がありません")}
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
                      {t("评分", "Score", "評価")}: {detail.seller_info.score}
                    </span>
                  )}
                  {detail.seller_info.good_rate !== undefined && (
                    <span>
                      {t("好评率", "Good Rate", "良い評価")}: {detail.seller_info.good_rate}%
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
              {t("费用明细", "Fee Details", "費用明細")}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("来源", "Source", "来源")}</span>
                <span className="font-medium">Yahoo {t("拍卖", "Auctions", "オークション")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("日本国内运费", "Domestic Shipping", "国内送料")}</span>
                <span className="font-medium">{t("0日元", "0 JPY", "0円")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("手续费", "Service Fee", "手数料")}</span>
                <span className="font-medium text-orange-500">
                  {t("200日元(约11元人民币)", "200 JPY (~11 CNY)", "200円(約11元)")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("国际运费", "International Shipping", "国際送料")}</span>
                <span className="font-medium">
                  {t("到达日本仓库后称重收取", "Weighed after arrival at Japan warehouse", "日本倉庫到着後に計量して徴収")}
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
                ? t("已复制", "Copied!", "コピーしました")
                : t("复制链接", "Copy Link", "リンクをコピー")}
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
                ? t("已收藏", "Favorited", "お気に入り")
                : t("收藏", "Favorite", "お気に入り")}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs: Description + Shopping Info */}
      <Tabs defaultValue="description" className="mb-12">
        <TabsList>
          <TabsTrigger value="description">
            {t("商品介绍", "Description", "商品紹介")}
          </TabsTrigger>
          <TabsTrigger value="shopping-info">
            {t("购物说明", "Shopping Info", "ご購入案内")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description" className="mt-4">
          <Card className="p-6">
            <div className="text-xs text-muted-foreground mb-4">
              {t(
                "翻译仅做参考，不承担因翻译功能失误造成的损失。如需准确了解商品详情请咨询客服。",
                "Translation is for reference only. We are not responsible for translation errors. Please contact customer service for accurate product details.",
                "翻訳は参考用です。翻訳機能の誤りによる損害は負いかねます。正確な商品詳細についてはカスタマーサービスにお問い合わせください。"
              )}
            </div>
            <div className="prose prose-sm max-w-none">
              <h3 className="text-lg font-semibold mb-2">
                {t("详细介绍", "Details", "詳細")}
              </h3>
              <div
                className="whitespace-pre-wrap text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: detail.content || detail.description || "" }}
              />
              {!detail.content && !detail.description && (
                <p className="text-muted-foreground">
                  {t("暂无介绍", "No description available", "説明がありません")}
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="shopping-info" className="mt-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t("购物说明", "Shopping Information", "ご購入案内")}
            </h3>
            <div className="prose prose-sm max-w-none space-y-3">
              <p className="text-sm">
                {t(
                  "该商品下单后无法取消和退换货，介意勿拍。",
                  "This item cannot be cancelled or returned after ordering. Please consider carefully before purchasing.",
                  "ご注文後のキャンセルや返品はできません。ご了承の上ご購入ください。"
                )}
              </p>
              <p className="text-sm">
                {t(
                  "如商品存在未标明的瑕疵，请在收到商品后24小时内联系客服处理。",
                  "If there are undisclosed defects, please contact customer service within 24 hours of receipt.",
                  "明示されていない瑕疵がある場合は、商品到着後24時間以内にカスタマーサービスにお問い合わせください。"
                )}
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
                <span className="text-xs">{t("客服", "Service", "カスタマーサービス")}</span>
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
                <span className="text-xs">{t("翻译", "Translate", "翻訳")}</span>
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
                  {t("出价竞拍", "Place Bid", "入札する")}
                </Button>
              )}
              {/* 一口价购买 Button */}
              {detail.fastprice && Number(detail.fastprice) > 0 && !isEnded && (
                <Button
                  variant="default"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={handleBuyout}
                >
                  {t("一口价购买", "Buy Now", "今すぐ購入")}
                </Button>
              )}
              {isEnded && (
                <Button variant="secondary" disabled>
                  {t("已结束", "Ended", "終了")}
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
              {t("出价竞拍", "Place a Bid", "入札する")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "请输入您的出价金额，出价后无法取消。",
                "Enter your bid amount. Bids cannot be cancelled.",
                "入札金額を入力してください。入札後のキャンセルはできません。"
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current Price Display */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm text-muted-foreground">
                {t("当前价格", "Current Price", "現在の価格")}:
              </span>
              <span className="text-lg font-bold text-orange-500">
                ¥{Number(detail.bid_price).toLocaleString()}
              </span>
            </div>

            {/* Bid Input */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                {t("您的出价（日元）", "Your Bid (JPY)", "入札額（円）")}
              </label>
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => {
                  setBidAmount(e.target.value);
                  setBidError("");
                }}
                placeholder={t("请输入出价金额", "Enter bid amount", "入札額を入力")}
                min={detail.bid_price ? detail.bid_price + 1 : 1}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("最低出价", "Minimum bid", "最低入札額")}: ¥{((detail.bid_price || 0) + 1).toLocaleString()}
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
                {t(
                  "我已阅读并同意：出价成功后无法取消，若竞拍成功需按时完成支付。",
                  "I have read and agree: Once a bid is placed, it cannot be cancelled. If I win, I must complete payment on time.",
                  "入札後のキャンセルはできません。落札した場合、期日までにお支払いいただく必要があることに同意します。"
                )}
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
              {t("取消", "Cancel", "キャンセル")}
            </Button>
            <Button
              variant="default"
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleBid}
              disabled={bidLoading}
            >
              {bidLoading
                ? t("提交中...", "Submitting...", "送信中...")
                : t("确认出价", "Confirm Bid", "入札を確認")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
