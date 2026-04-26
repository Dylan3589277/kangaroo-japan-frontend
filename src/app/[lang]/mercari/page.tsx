"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MercariItem {
  id: string;
  goods_no: string;
  goods_name: string;
  cover: string;
  price: number;
  price_rmb: number;
  status: string;
  seller_name?: string;
  seller_id?: string;
  bid_count?: number;
  remain_time?: string;
  imgurls?: string[];
}

interface MercariResponse {
  goodsList: MercariItem[];
  totalPages: number;
  total: number;
}

const SORT_OPTIONS = [
  { value: "SORT_CREATED_TIME|ORDER_DESC", labelKey: "sortNewest" },
  { value: "SORT_PRICE|ORDER_ASC", labelKey: "sortPriceAsc" },
  { value: "SORT_PRICE|ORDER_DESC", labelKey: "sortPriceDesc" },
];

const PAGE_SIZE = 20;

export default function MercariPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";
  const t = useTranslations('mercari');

  const [items, setItems] = useState<MercariItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [imgErrorIds, setImgErrorIds] = useState<Set<string>>(new Set());

  // Filters
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [searchLng, setSearchLng] = useState<"japan" | "chinese">("japan");
  const [category, setCategory] = useState("");
  const [cname, setCname] = useState(t('allCategories'));
  const [sort, setSort] = useState("SORT_CREATED_TIME|ORDER_DESC");
  const [sortname, setSortname] = useState(
    t('sortNewest')
  );

  // Categories
  const [catList, setCatList] = useState<any[]>([]);
  const [showCatSelect, setShowCatSelect] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.request("/integrations/mercari/categories");
      if (res.success && res.data) {
        const data = res.data as any;
        if (Array.isArray(data)) {
          setCatList(data);
        } else if (data.categories) {
          setCatList(data.categories);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async (p: number, kw: string, cat: string, s: string, lng: string) => {
    setLoading(true);
    try {
      const res = await api.request(`/integrations/mercari/search`, {
        method: "POST",
        body: {
          keyword: kw,
          page: p,
          category: cat || undefined,
          sort: s,
          lang: lng,
        },
      });
      if (res.success && res.data) {
        const data = res.data as any;
        // Handle different response shapes
        if (data.goodsList) {
          setItems(data.goodsList || []);
          setTotalPages(data.totalPages || 1);
        } else if (data.data) {
          // Might be wrapped
          const inner = data.data as any;
          setItems(inner.goodsList || inner.items || inner || []);
          setTotalPages(inner.totalPages || data.totalPages || 1);
        } else if (Array.isArray(data)) {
          setItems(data);
          setTotalPages(1);
        } else {
          setItems([]);
          setTotalPages(1);
        }
      } else {
        setItems([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error("Failed to fetch Mercari items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchData(page, keyword, category, sort, searchLng);
  }, [page, sort, category, searchLng]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData(1, keyword, category, sort, searchLng);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const toggleLang = () => {
    setSearchLng((prev) => (prev === "japan" ? "chinese" : "japan"));
    setPage(1);
  };

  const confirmCategory = (catId: string, catName: string) => {
    setCategory(catId);
    setCname(catName);
    setPage(1);
  };

  const confirmSort = (sortVal: string, sortLabel: string) => {
    setSort(sortVal);
    setSortname(sortLabel);
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    if (status === "ITEM_STATUS_TRADING" || status === "sold_out") {
      return (
        <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
          {t('sold')}
        </Badge>
      );
    }
    return null;
  };

  const getSortLabel = (opt: { value: string; labelKey: string }) => t(opt.labelKey);

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <div className="container mx-auto py-6 px-4">
        {/* Page Title */}
        <h1 className="text-2xl font-bold mb-4">
          {t('title')}
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={toggleLang}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                title={t('toggleLang')}
              >
                {searchLng === "japan" ? (
                  <span className="text-sm font-bold text-blue-600">日</span>
                ) : (
                  <span className="text-sm font-bold text-orange-600">中</span>
                )}
              </button>
            </div>
            <Button type="submit">
              {t('searchBtn')}
            </Button>
          </div>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Category Select */}
          <div className="relative">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowCatSelect(!showCatSelect)}
              className="gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {cname}
            </Button>
            {showCatSelect && catList.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto">
                <div
                  className="px-4 py-2 hover:bg-muted cursor-pointer text-sm"
                  onClick={() => {
                    confirmCategory("", t('allCategories'));
                    setShowCatSelect(false);
                  }}
                >
                  {t('allCategories')}
                </div>
                {catList.map((cat: any, idx: number) => (
                  <div
                    key={idx}
                    className="px-4 py-2 hover:bg-muted cursor-pointer text-sm"
                    onClick={() => {
                      const name = cat.label || cat.name || cat.category_name || String(cat.value || cat.id || "");
                      confirmCategory(String(cat.value || cat.id), name);
                      setShowCatSelect(false);
                    }}
                  >
                    {cat.label || cat.name || cat.category_name || String(cat.value || cat.id)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sort Select */}
          <Select value={sort} onValueChange={(val) => {
            const opt = SORT_OPTIONS.find((o) => o.value === val);
            if (opt && val) {
              confirmSort(val, getSortLabel(opt));
            }
          }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={sortname} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {getSortLabel(opt)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/3" />
                </div>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-muted-foreground text-lg">
              {t('noItems')}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              {t('tryAgain')}
            </p>
          </div>
        ) : (
          /* Item Grid */
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <Link key={item.goods_no || item.id} href={`/mercari/${item.goods_no || item.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full group">
                    {/* Image */}
                    <div className="relative aspect-square bg-muted">
                      {(item.cover || item.imgurls?.[0]) && !imgErrorIds.has(item.goods_no || item.id) ? (
                        <Image
                          src={item.cover || item.imgurls![0]}
                          alt={item.goods_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          onError={() => {
                            setImgErrorIds((prev) => new Set(prev).add(item.goods_no || item.id));
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          {t('noImage')}
                        </div>
                      )}
                      {getStatusBadge(item.status)}
                    </div>

                    {/* Content */}
                    <div className="p-3">
                      <h3 className="text-sm font-medium line-clamp-2 mb-2 min-h-[2.5rem]">
                        {item.goods_name}
                      </h3>

                      {/* Bid count + remain time */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        {item.bid_count !== undefined && item.bid_count > 0 && (
                          <span>
                            {t('bids')}: {item.bid_count}
                          </span>
                        )}
                        {item.remain_time && (
                          <span className="truncate">{item.remain_time}</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-orange-500">
                          ¥{Number(item.price).toLocaleString()}
                        </span>
                        {item.price_rmb && (
                          <span className="text-xs text-muted-foreground">
                            ≈¥{Number(item.price_rmb).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Seller */}
                      {item.seller_name && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {item.seller_name}
                        </p>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  {t('prev')}
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
                  const p = startPage + i;
                  if (p > totalPages) return null;
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
                >
                  {t('next')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
