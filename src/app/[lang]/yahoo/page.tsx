"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
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

interface YahooItem {
  goods_no: string;
  goods_name: string;
  cover: string;
  price: number;
  price_rmb?: number;
  buyout_price?: number;
  status?: string;
  seller_name?: string;
  seller_id?: string;
  bid_count?: number;
  remain_time?: string;
  imgurls?: string[];
}

interface YahooResponse {
  goodsList: YahooItem[];
  totalPages: number;
  total: number;
}

const SORT_OPTIONS = [
  { value: "SORT_CREATED_TIME|ORDER_DESC", label: { zh: "最新上架", en: "Newest", ja: "新着順" } },
  { value: "SORT_PRICE|ORDER_ASC", label: { zh: "价格升序", en: "Price: Low to High", ja: "価格安い順" } },
  { value: "SORT_PRICE|ORDER_DESC", label: { zh: "价格降序", en: "Price: High to Low", ja: "価格高い順" } },
  { value: "SORT_BID_COUNT|ORDER_DESC", label: { zh: "出价次数", en: "Bid Count", ja: "入札数" } },
  { value: "SORT_REMAIN_TIME|ORDER_ASC", label: { zh: "剩余时间", en: "Time Left", ja: "残り時間" } },
];

const CATEGORIES = [
  { value: "", label: { zh: "全部分类", en: "All Categories", ja: "全カテゴリー" } },
  { value: "1", label: { zh: "女士服装", en: "Women's Clothing", ja: "レディース服" } },
  { value: "2", label: { zh: "男士服装", en: "Men's Clothing", ja: "メンズ服" } },
  { value: "3", label: { zh: "箱包", en: "Bags", ja: "バッグ" } },
  { value: "4", label: { zh: "手表", en: "Watches", ja: "腕時計" } },
  { value: "5", label: { zh: "珠宝首饰", en: "Jewelry", ja: "ジュエリー" } },
  { value: "6", label: { zh: "电子产品", en: "Electronics", ja: "家電" } },
  { value: "7", label: { zh: "游戏", en: "Video Games", ja: "ゲーム" } },
  { value: "8", label: { zh: "动漫", en: "Anime", ja: "アニメ" } },
  { value: "9", label: { zh: "运动户外", en: "Sports & Outdoors", ja: "スポーツ&アウトドア" } },
  { value: "10", label: { zh: "收藏卡", en: "Trading Cards", ja: "トレーディングカード" } },
  { value: "11", label: { zh: "古董", en: "Antiques", ja: "アンティーク" } },
  { value: "12", label: { zh: "其他", en: "Other", ja: "その他" } },
];

const PAGE_SIZE = 20;

export default function YahooPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";

  const [items, setItems] = useState<YahooItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [imgErrorIds, setImgErrorIds] = useState<Set<string>>(new Set());

  // Filters
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [searchLng, setSearchLng] = useState<"japan" | "chinese">("japan");
  const [category, setCategory] = useState<string>(searchParams.get("cat") || "");
  const [sort, setSort] = useState("SORT_CREATED_TIME|ORDER_DESC");

  const t = (obj: Record<string, string>) => obj[lang] || obj.zh;

  const fetchData = useCallback(async (p: number, kw: string, cat: string, s: string, lng: string) => {
    setLoading(true);
    try {
      const paramsObj: Record<string, string> = {};
      if (kw) paramsObj.kw = kw;
      if (cat) paramsObj.cat = cat;
      if (s) paramsObj.sort = s;
      paramsObj.page = String(p);
      if (lng) paramsObj.lang = lng;

      const query = new URLSearchParams(paramsObj).toString();
      const res = await api.request<YahooResponse>(`/yahoo/goods${query ? `?${query}` : ""}`);
      if (res.success && res.data) {
        const data = res.data as any;
        if (data.goodsList) {
          setItems(data.goodsList || []);
          setTotalPages(data.totalPages || 1);
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
      console.error("Failed to fetch Yahoo items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const getStatusBadge = (item: YahooItem) => {
    if (item.status === "sold_out" || item.status === "end") {
      return (
        <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
          {lang === "zh" ? "已结束" : lang === "en" ? "Ended" : "終了"}
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <div className="container mx-auto py-6 px-4">
        {/* Page Title */}
        <h1 className="text-2xl font-bold mb-4">
          {lang === "zh" ? "Yahoo 竞拍" : lang === "en" ? "Yahoo Auctions" : "ヤフオク"}
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder={
                  lang === "zh"
                    ? "输入中文或日文关键词检索..."
                    : lang === "en"
                    ? "Search by keyword (Chinese/Japanese)..."
                    : "キーワードを入力（中文/日本語）..."
                }
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                onClick={toggleLang}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                title={lang === "zh" ? "切换搜索语言" : lang === "en" ? "Toggle search language" : "検索言語切替"}
              >
                {searchLng === "japan" ? (
                  <span className="text-sm font-bold text-blue-600">日</span>
                ) : (
                  <span className="text-sm font-bold text-orange-600">中</span>
                )}
              </button>
            </div>
            <Button type="submit">
              {lang === "zh" ? "搜索" : lang === "en" ? "Search" : "検索"}
            </Button>
          </div>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Category Select */}
          <Select value={category} onValueChange={(val: string | null) => {
            if (val !== null) setCategory(val);
            setPage(1);
          }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t(CATEGORIES.find(c => c.value === category)?.label || CATEGORIES[0].label)} />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {t(cat.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort Select */}
          <Select value={sort} onValueChange={(val) => {
            if (val) {
              setSort(val);
              setPage(1);
            }
          }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t(SORT_OPTIONS.find(o => o.value === sort)?.label || SORT_OPTIONS[0].label)} />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.label)}
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
            <div className="text-6xl mb-4">🔨</div>
            <p className="text-muted-foreground text-lg">
              {lang === "zh"
                ? "没有找到商品"
                : lang === "en"
                ? "No items found"
                : "商品が見つかりません"}
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              {lang === "zh"
                ? "试试其他关键词或分类"
                : lang === "en"
                ? "Try different keywords or categories"
                : "別のキーワードやカテゴリをお試しください"}
            </p>
          </div>
        ) : (
          /* Item Grid */
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <Link key={item.goods_no} href={`/yahoo/${item.goods_no}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full group">
                    {/* Image */}
                    <div className="relative aspect-square bg-muted">
                      {(item.cover || item.imgurls?.[0]) && !imgErrorIds.has(item.goods_no) ? (
                        <Image
                          src={item.cover || item.imgurls![0]}
                          alt={item.goods_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                          onError={() => {
                            setImgErrorIds((prev) => new Set(prev).add(item.goods_no));
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          {lang === "zh" ? "无图片" : lang === "en" ? "No Image" : "画像なし"}
                        </div>
                      )}
                      {getStatusBadge(item)}
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
                            {lang === "zh" ? "出价" : lang === "en" ? "Bids" : "入札"}: {item.bid_count}
                          </span>
                        )}
                        {item.remain_time && (
                          <span className="truncate">{item.remain_time}</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-1 flex-wrap">
                        <span className="text-lg font-bold text-orange-500">
                          ¥{Number(item.price).toLocaleString()}
                        </span>
                        {item.price_rmb && (
                          <span className="text-xs text-muted-foreground">
                            ≈¥{Number(item.price_rmb).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Buyout Price */}
                      {item.buyout_price && Number(item.buyout_price) > 0 && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          一口价: ¥{Number(item.buyout_price).toLocaleString()}
                        </div>
                      )}

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
                  {lang === "zh" ? "上一页" : lang === "en" ? "Prev" : "前へ"}
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
                  {lang === "zh" ? "下一页" : lang === "en" ? "Next" : "次へ"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
