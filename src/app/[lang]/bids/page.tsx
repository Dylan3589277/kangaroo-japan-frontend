"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BidItem {
  id: string;
  product_id: string;
  title: string;
  cover_image: string | null;
  platform: string;
  bid_amount: number;
  currency: string;
  status: string;
  status_label: string;
  current_price?: number;
  end_time?: string;
  created_at: string;
  auction_url?: string;
  is_winning?: boolean;
}

interface BidListData {
  list: BidItem[];
  totalPages: number;
  total?: number;
}

const TAB_CONFIG = [
  { value: "0", label: "bidding" },
  { value: "1", label: "won" },
  { value: "2", label: "others" },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  bidding: { label: "竞拍中", color: "bg-blue-500" },
  winning: { label: "领先", color: "bg-green-500" },
  outbid: { label: "已出局", color: "bg-orange-500" },
  won: { label: "已中标", color: "bg-green-600" },
  lost: { label: "未中标", color: "bg-gray-500" },
  cancelled: { label: "已取消", color: "bg-red-500" },
  paid: { label: "待付款", color: "bg-yellow-500" },
};

function getStatusConfig(status: string) {
  return STATUS_MAP[status] || { label: status, color: "bg-gray-500" };
}

export default function BidsPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const t = useTranslations('bids');
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [bids, setBids] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tabValue, setTabValue] = useState("0");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const fetchBids = useCallback(
    async (pageNum: number, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await api.request<BidListData>(
          `/yahoo/bids/list?status=${tabValue}&page=${pageNum}`
        );
        if (res.success && res.data) {
          const data = res.data;
          if (append) {
            setBids((prev) => [...prev, ...(data.list || [])]);
          } else {
            setBids(data.list || []);
          }
          setTotalPages(data.totalPages || 0);
        } else {
          if (!append) setBids([]);
        }
      } catch (error) {
        console.error("Failed to fetch bids:", error);
        if (!append) setBids([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tabValue]
  );

  // Auth check + initial fetch
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      setPage(1);
      setBids([]);
      fetchBids(1);
    }
  }, [isAuthenticated, authLoading, lang, tabValue, fetchBids, router]);

  // Infinite scroll - IntersectionObserver
  useEffect(() => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && page < totalPages) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, loadingMore, page, totalPages]);

  // Fetch more when page changes (after initial)
  useEffect(() => {
    if (page > 1) {
      fetchBids(page, true);
    }
  }, [page, fetchBids]);

  const handleTabChange = (value: string) => {
    setTabValue(value);
    setPage(1);
    setBids([]);
  };

  const formatAmount = (amount: number, currency = "JPY") => {
    if (currency === "JPY")
      return `¥${Math.round(amount).toLocaleString()}`;
    if (currency === "USD") return `$${amount.toFixed(2)}`;
    return `¥${amount.toFixed(2)}`;
  };

  // Not authenticated view
  if (!authLoading && !isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      {/* Tabs */}
      <Tabs
        value={tabValue}
        onValueChange={handleTabChange}
        className="mb-6"
      >
        <TabsList className="flex flex-wrap h-auto gap-1">
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(tab.label)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-20 h-20 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : bids.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔨</div>
          <h2 className="text-xl font-bold mb-2">{t('noOrders')}</h2>
          <p className="text-muted-foreground mb-8">
            {t('browseSubtitle')}
          </p>
          <Link href={`/${lang}/yahoo`}>
            <Button>{t('browseProducts')}</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => (
            <Link
              key={bid.id}
              href={`/${lang}/products/${bid.product_id || bid.id}`}
            >
              <Card className="overflow-hidden hover:bg-muted/30 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Cover Image */}
                    {bid.cover_image ? (
                      <Image
                        src={bid.cover_image}
                        alt={bid.title}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded border shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs shrink-0">
                        {t('noImage')}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium line-clamp-2 mb-1">
                        {bid.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={`${
                            getStatusConfig(bid.status).color
                          } text-white text-xs`}
                        >
                          {bid.status_label ||
                            getStatusConfig(bid.status).label}
                        </Badge>
                        {bid.is_winning !== undefined && (
                          <span
                            className={`text-xs ${
                              bid.is_winning
                                ? "text-green-600"
                                : "text-orange-500"
                            }`}
                          >
                            {bid.is_winning ? t('winning') : t('outbid')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          {t('bidAmount')}:{" "}
                          {formatAmount(bid.bid_amount, bid.currency)}
                        </span>
                        {bid.current_price !== undefined && (
                          <span>
                            {t('currentPrice')}:{" "}
                            {formatAmount(
                              bid.current_price,
                              bid.currency
                            )}
                          </span>
                        )}
                      </div>
                      {bid.end_time && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('endTime')}: {new Date(bid.end_time).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-4" />

          {loadingMore && (
            <div className="text-center py-4">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}

          {!loadingMore && page >= totalPages && bids.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              {t('noMore')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
