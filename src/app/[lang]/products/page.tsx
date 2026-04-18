"use client";

import { useState, useEffect } from "react";
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

interface Product {
  id: string;
  platform: string;
  platformName: string;
  title: string;
  priceJpy: number;
  priceCny: number;
  priceUsd: number;
  currency: string;
  images: string[];
  imagesCount: number;
  rating: number | null;
  reviewCount: number;
  salesCount: number;
  inStock: boolean;
  status: string;
  // UnifiedSearch 额外字段
  url?: string;
  brand?: string;
  itemCondition?: string;
  shipping?: string;
}

interface Category {
  id: string;
  name: string;
  nameZh: string;
  nameEn: string;
  nameJa: string;
  slug: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

export default function ProductsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";
  const initialSearch = searchParams.get("search") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt_desc");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");

  useEffect(() => {
    fetchCategories();
  }, [lang]);

  useEffect(() => {
    fetchProducts();
  }, [lang, selectedPlatform, selectedCategory, sortBy, pagination.page]);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories(lang);
      if (res.success && res.data && Array.isArray(res.data)) {
        setCategories(res.data as Category[]);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {
        lang,
        page: pagination.page,
        limit: 20,
        sort: sortBy,
      };

      if (selectedPlatform !== "all") {
        params.platform = selectedPlatform;
      }
      if (selectedCategory !== "all") {
        params.categoryId = selectedCategory;
      }
      if (priceMin) {
        params.priceMin = Number(priceMin);
      }
      if (priceMax) {
        params.priceMax = Number(priceMax);
      }

      const res = await api.getProducts(params);
      if (res.success && res.data && typeof res.data === 'object') {
        const data = res.data as any;
        setProducts(Array.isArray(data.data) ? data.data : []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchProducts();
      return;
    }

    setLoading(true);
    try {
      // 使用统一搜索 API（并行搜索 Rakuten + Yahoo）
      const res = await api.unifiedSearch({
        keyword: searchQuery,
        page: pagination.page,
        limit: 20,
      });
      if (res.success && res.data && typeof res.data === 'object') {
        const data = res.data as any;
        setProducts(Array.isArray(data.items) ? data.items : []);
        setPagination(data.pagination || pagination);
      }
    } catch (error) {
      console.error("Failed to search products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const getPriceByCurrency = (product: Product) => {
    switch (lang) {
      case "en":
        return `$${product.priceUsd.toFixed(2)}`;
      case "ja":
        return `¥${product.priceJpy.toLocaleString()}`;
      default:
        return `¥${product.priceCny.toFixed(2)}`;
    }
  };

  // JSON-LD for products listing page
  const productsJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.slice(0, 10).map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://jp-buy.com/products/${product.id}`,
      name: product.title,
      image: product.images?.[0] || undefined,
    })),
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* 全局 Header */}
      <Header
        showSearch
        initialSearchQuery={initialSearch}
        onSearch={(query) => {
          setSearchQuery(query);
          if (query.trim()) {
            // Trigger search
            const form = document.getElementById("search-form") as HTMLFormElement;
            if (form) form.requestSubmit();
          }
        }}
      />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productsJsonLd) }}
      />

      <div className="container mx-auto py-8 px-4">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {lang === "zh" ? "商品列表" : lang === "en" ? "Products" : "商品一覧"}
            {initialSearch && (
              <span className="ml-2 text-lg font-normal text-muted-foreground">
                - {initialSearch}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground">
          {lang === "zh"
            ? "浏览我们的跨境电商比价商品"
            : lang === "en"
            ? "Browse our cross-border e-commerce products"
            : "越境EC価格比較商品をご覧ください"}
        </p>
      </div>

      {/* Search Bar */}
      <form id="search-form" onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={
              lang === "zh"
                ? "搜索商品..."
                : lang === "en"
                ? "Search products..."
                : "商品を検索..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            {lang === "zh" ? "搜索" : lang === "en" ? "Search" : "検索"}
          </Button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        {/* Platform Filter */}
        <Select value={selectedPlatform} onValueChange={(val) => setSelectedPlatform(val || 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue
              placeholder={lang === "zh" ? "平台" : lang === "en" ? "Platform" : "プラットフォーム"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {lang === "zh" ? "全部平台" : lang === "en" ? "All Platforms" : "全プラットフォーム"}
            </SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
            <SelectItem value="mercari">Mercari</SelectItem>
            <SelectItem value="rakuten">
              {lang === "zh" ? "乐天" : lang === "en" ? "Rakuten" : "楽天"}
            </SelectItem>
            <SelectItem value="yahoo">Yahoo</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || 'all')}>
          <SelectTrigger className="w-[160px]">
            <SelectValue
              placeholder={lang === "zh" ? "分类" : lang === "en" ? "Category" : "カテゴリー"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {lang === "zh" ? "全部分类" : lang === "en" ? "All Categories" : "全カテゴリー"}
            </SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(val) => setSortBy(val || 'createdAt_desc')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue
              placeholder={lang === "zh" ? "排序" : lang === "en" ? "Sort" : "並び替え"}
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt_desc">
              {lang === "zh" ? "最新上架" : lang === "en" ? "Newest" : "新着順"}
            </SelectItem>
            <SelectItem value="price_asc">
              {lang === "zh" ? "价格从低到高" : lang === "en" ? "Price: Low to High" : "価格安い順"}
            </SelectItem>
            <SelectItem value="price_desc">
              {lang === "zh" ? "价格从高到低" : lang === "en" ? "Price: High to Low" : "価格高い順"}
            </SelectItem>
            <SelectItem value="rating_desc">
              {lang === "zh" ? "评分最高" : lang === "en" ? "Highest Rated" : "評価高い順"}
            </SelectItem>
            <SelectItem value="sales_desc">
              {lang === "zh" ? "销量最高" : lang === "en" ? "Best Selling" : "売れ筋"}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Price Range */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={
              lang === "zh" ? "最低价" : lang === "en" ? "Min" : "最安"
            }
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            className="w-[100px]"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder={
              lang === "zh" ? "最高价" : lang === "en" ? "Max" : "最高"
            }
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            className="w-[100px]"
          />
          <Button variant="outline" onClick={fetchProducts}>
            {lang === "zh" ? "应用" : lang === "en" ? "Apply" : "適用"}
          </Button>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {lang === "zh"
              ? "没有找到商品"
              : lang === "en"
              ? "No products found"
              : "商品が見つかりません"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                {/* Image */}
                <div className="relative h-48 bg-muted">
                  {product.images && product.images[0] ? (
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      {lang === "zh" ? "无图片" : lang === "en" ? "No Image" : "画像なし"}
                    </div>
                  )}
                  {/* Platform Badge */}
                  <Badge
                    className={`absolute top-2 left-2 ${PLATFORM_COLORS[product.platform] || "bg-gray-500"} text-white`}
                  >
                    {product.platformName}
                  </Badge>
                  {/* Stock Status */}
                  {!product.inStock && (
                    <Badge variant="destructive" className="absolute top-2 right-2">
                      {lang === "zh" ? "售罄" : lang === "en" ? "Sold Out" : "売り切れ"}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-medium line-clamp-2 mb-2 min-h-[3rem]">
                    {product.title}
                  </h3>

                  {/* Rating */}
                  {product.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm">{Number(product.rating).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">
                        ({product.reviewCount})
                      </span>
                    </div>
                  )}

                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-primary">
                      {getPriceByCurrency(product)}
                    </span>
                    {lang === "ja" && (
                      <span className="text-sm text-muted-foreground">
                        (¥{Number(product.priceJpy).toLocaleString()})
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <Button
            variant="outline"
            disabled={!pagination.hasPrev}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            {lang === "zh" ? "上一页" : lang === "en" ? "Previous" : "前へ"}
          </Button>
          <span className="flex items-center px-4">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={!pagination.hasNext}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            {lang === "zh" ? "下一页" : lang === "en" ? "Next" : "次へ"}
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
