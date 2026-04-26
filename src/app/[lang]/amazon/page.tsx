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

interface AmazonItem {
  id: string;
  goods_no: string;
  goods_name: string;
  cover: string;
  price: number;
  price_rmb: number;
  status: string;
  imgurls?: string[];
  seller_name?: string;
  asin?: string;
}

interface AmazonResponse {
  goodsList: AmazonItem[];
  totalPages: number;
  total: number;
}

interface Category {
  value: string;
  label: string;
  children?: Category[];
}

const SORT_OPTIONS = [
  { value: "SORT_CREATED_TIME|ORDER_DESC", labelKey: "sortNewest" },
  { value: "SORT_PRICE|ORDER_ASC", labelKey: "sortPriceAsc" },
  { value: "SORT_PRICE|ORDER_DESC", labelKey: "sortPriceDesc" },
];

const PAGE_SIZE = 20;

export default function AmazonPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";
  const t = useTranslations('amazon');

  const [items, setItems] = useState<AmazonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [imgErrorIds, setImgErrorIds] = useState<Set<string>>(new Set());

  // Filters
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");
  const [category, setCategory] = useState("");
  const [cname, setCname] = useState(t('allCategories'));
  const [sort, setSort] = useState("SORT_CREATED_TIME|ORDER_DESC");
  const [sortname, setSortname] = useState(
    t('sortNewest')
  );

  // Categories (two-level: major -> minor)
  const [catList, setCatList] = useState<Category[]>([]);
  const [subCats, setSubCats] = useState<Category[]>([]);
  const [selectedMajorCat, setSelectedMajorCat] = useState<string>("");
  const [showCatSelect, setShowCatSelect] = useState(false);
  const [showSubCatSelect, setShowSubCatSelect] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const getSortLabel = (opt: { value: string; labelKey: string }) => t(opt.labelKey);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("amazon_search_history");
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveSearchHistory = (kw: string) => {
    if (!kw.trim()) return;
    const updated = [kw, ...searchHistory.filter((h) => h !== kw)].slice(0, 10);
    setSearchHistory(updated);
    try {
      localStorage.setItem("amazon_search_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.request("/amazon/cats", {
        method: "POST",
        body: { type: "select" },
      });
      // Handle both response shapes
      const data = res.data as any;
      if (data) {
        const cats = Array.isArray(data) ? data : data.cats || data.list || data.data || [];
        if (Array.isArray(cats)) {
          setCatList(cats);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async (p: number, kw: string, cat: string, s: string) => {
    setLoading(true);
    try {
      const res = await api.request("/amazon/goods", {
        method: "POST",
        body: {
          kw,
          cat: cat || undefined,
          sort: s,
          lng: lang,
          page: p,
        },
      });
      if (res.success && res.data) {
        const data = res.data as any;
        if (data.goodsList) {
          setItems(data.goodsList || []);
          setTotalPages(data.totalPages || 1);
        } else if (data.data) {
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
      console.error("Failed to fetch Amazon items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchData(page, keyword, category, sort);
  }, [page, sort, category]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    saveSearchHistory(keyword);
    setPage(1);
    fetchData(1, keyword, category, sort);
    setShowHistory(false);
  };

  const handleKeywordClick = (kw: string) => {
    setKeyword(kw);
    setPage(1);
    fetchData(1, kw, category, sort);
    setShowHistory(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Category selection: major category
  const selectMajorCat = (cat: Category) => {
    setSelectedMajorCat(cat.value);
    if (cat.children && cat.children.length > 0) {
      setSubCats(cat.children);
      setShowCatSelect(false);
      setShowSubCatSelect(true);
    } else {
      setCategory(cat.value);
      setCname(cat.label);
      setShowCatSelect(false);
      setSubCats([]);
      setPage(1);
    }
  };

  // Category selection: sub category
  const selectSubCat = (cat: Category) => {
    setCategory(cat.value);
    setCname(cat.label);
    setShowSubCatSelect(false);
    setSelectedMajorCat("");
    setPage(1);
  };

  const clearCategory = () => {
    setCategory("");
    setCname(t('allCategories'));
    setShowCatSelect(false);
    setShowSubCatSelect(false);
    setSelectedMajorCat("");
    setSubCats([]);
    setPage(1);
  };

  const confirmSort = (sortVal: string, sortLabel: string) => {
    setSort(sortVal);
    setSortname(sortLabel);
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    if (status === "sold_out" || status === "ITEM_STATUS_TRADING") {
      return (
        <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
          {t('sold')}
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
          {t('title')}
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-4 relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setShowHistory(true);
                }}
                onFocus={() => setShowHistory(searchHistory.length > 0)}
                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                className="pr-12"
              />
            </div>
            <Button type="submit">
              {t('searchBtn')}
            </Button>
          </div>

          {/* Search History Dropdown */}
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50">
              <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                {t('searchHistory')}
              </div>
              {searchHistory.map((kw, idx) => (
                <div
                  key={idx}
                  className="px-4 py-2 hover:bg-muted cursor-pointer text-sm flex items-center gap-2"
                  onMouseDown={() => handleKeywordClick(kw)}
                >
                  <svg className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate">{kw}</span>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Category Select */}
          <div className="relative">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowCatSelect(!showCatSelect);
                setShowSubCatSelect(false);
              }}
              className="gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {cname}
            </Button>
            {/* Major Category Dropdown */}
            {showCatSelect && catList.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[220px] max-h-60 overflow-y-auto">
                <div
                  className="px-4 py-2 hover:bg-muted cursor-pointer text-sm font-medium text-primary"
                  onClick={() => {
                    clearCategory();
                    setShowCatSelect(false);
                  }}
                >
                  {t('allCategories')}
                </div>
                {catList.map((cat: Category, idx: number) => (
                  <div
                    key={idx}
                    className={`px-4 py-2 hover:bg-muted cursor-pointer text-sm flex items-center justify-between ${
                      selectedMajorCat === cat.value ? "bg-muted/50" : ""
                    }`}
                    onClick={() => selectMajorCat(cat)}
                  >
                    <span>{cat.label}</span>
                    {cat.children && cat.children.length > 0 && (
                      <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Sub Category Dropdown */}
            {showSubCatSelect && subCats.length > 0 && (
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-[220px] max-h-60 overflow-y-auto">
                <div
                  className="px-4 py-2 hover:bg-muted cursor-pointer text-sm text-muted-foreground flex items-center gap-1"
                  onClick={() => {
                    setShowSubCatSelect(false);
                    setShowCatSelect(true);
                  }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t('back')}
                </div>
                <div
                  className="px-4 py-2 hover:bg-muted cursor-pointer text-sm font-medium text-primary"
                  onClick={() => {
                    // Select all items under this major category
                    setCategory(selectedMajorCat);
                    setCname(subCats[0]?.label?.split(" > ")[0] || cname);
                    setShowSubCatSelect(false);
                    setSelectedMajorCat("");
                    setSubCats([]);
                    setPage(1);
                  }}
                >
                  {t('selectAll')}
                </div>
                {subCats.map((cat: Category, idx: number) => (
                  <div
                    key={idx}
                    className="px-4 py-2 hover:bg-muted cursor-pointer text-sm"
                    onClick={() => selectSubCat(cat)}
                  >
                    {cat.label}
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
                <Link key={item.goods_no || item.id} href={`/${lang}/amazon/${item.goods_no || item.id}`}>
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

                      {/* ASIN */}
                      {item.asin && (
                        <p className="text-xs text-muted-foreground mb-1">
                          ASIN: {item.asin}
                        </p>
                      )}

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
