"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

interface CategoryInfo {
  id: string;
  name: string;
  nameZh: string;
  nameEn: string;
  nameJa: string;
  nameKo?: string;
  nameTh?: string;
  nameId?: string;
  nameVi?: string;
  slug: string;
  level: number;
  parentId: string | null;
  iconUrl: string | null;
}

interface Product {
  id: string;
  platform: string;
  platformName: string;
  title: string;
  priceJpy: number;
  priceCny: number;
  priceUsd: number;
  images: string[];
  rating: number | null;
  reviewCount: number;
  salesCount: number;
  inStock: boolean;
  slug?: string;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;
  const lang = (params.lang as string) || "zh";

  const [category, setCategory] = useState<CategoryInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState("createdAt_desc");

  const fetchCategoryAndProducts = useCallback(
    async (pageNum: number, append = false) => {
      try {
        if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);

        // Fetch category info by slug
        const catRes = await api.request(`/categories/slug/${slug}?lang=${lang}`);
        if (!catRes.success || !catRes.data) {
          setError("Category not found");
          return;
        }
        const catData = catRes.data as CategoryInfo;
        setCategory(catData);

        // Set page title for SEO
        document.title = `${catData.name} | JP-Buy`;

        // Fetch products for this category
        const prodRes = await api.request(
          `/categories/${catData.id}/products?lang=${lang}&page=${pageNum}&limit=20&sort=${sort}`,
        );
        if (prodRes.success && prodRes.data) {
          const data = prodRes.data as any;
          const productList = Array.isArray(data.data) ? data.data : [];
          if (append) {
            setProducts((prev) => [...prev, ...productList]);
          } else {
            setProducts(productList);
          }
          if (data.pagination) {
            setHasMore(data.pagination.hasNext);
            setTotal(data.pagination.total);
          }
        }
      } catch (err) {
        console.error("Failed to fetch category page:", err);
        setError("Failed to load category");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [slug, lang, sort],
  );

  useEffect(() => {
    setPage(1);
    setProducts([]);
    fetchCategoryAndProducts(1);
  }, [slug, lang, sort, fetchCategoryAndProducts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchCategoryAndProducts(nextPage, true);
  };

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    setPage(1);
  };

  const getPriceByCurrency = (product: Product) => {
    switch (lang) {
      case "en":
        return `$${Number(product.priceUsd).toFixed(2)}`;
      case "ja":
        return `¥${Number(product.priceJpy).toLocaleString()}`;
      default:
        return `¥${Number(product.priceCny).toFixed(2)}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header showSearch />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <Header showSearch />
        <main className="mx-auto max-w-7xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">
            {lang === "zh"
              ? "分类未找到"
              : lang === "en"
                ? "Category Not Found"
                : lang === "ko"
                  ? "카테고리를 찾을 수 없음"
                  : lang === "th"
                    ? "ไม่พบหมวดหมู่"
                    : lang === "id"
                      ? "Kategori Tidak Ditemukan"
                      : lang === "vi"
                        ? "Không tìm thấy danh mục"
                        : "カテゴリが見つかりません"}
          </h1>
          <p className="text-zinc-500 mb-8">
            {lang === "zh"
              ? "该分类不存在或已被移除"
              : "The category does not exist or has been removed"}
          </p>
          <Link href="/products">
            <Button className="bg-rose-600 text-white hover:bg-rose-700">
              {lang === "zh" ? "浏览商品" : "Browse Products"}
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header showSearch />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
          <Link href="/" className="hover:text-rose-600 transition-colors">
            {lang === "zh" ? "首页" : lang === "en" ? "Home" : lang === "ko" ? "홈" : lang === "th" ? "หน้าแรก" : lang === "id" ? "Beranda" : lang === "vi" ? "Trang chủ" : "ホーム"}
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-rose-600 transition-colors">
            {lang === "zh" ? "商品" : lang === "en" ? "Products" : lang === "ko" ? "상품" : lang === "th" ? "สินค้า" : lang === "id" ? "Produk" : lang === "vi" ? "Sản phẩm" : "商品"}
          </Link>
          <span>/</span>
          <span className="text-zinc-800 font-medium">{category.name}</span>
        </nav>

        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            {category.iconUrl && (
              <Image
                src={category.iconUrl}
                alt={category.name}
                width={40}
                height={40}
                className="rounded-lg"
              />
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">
              {category.name}
            </h1>
          </div>
          <p className="text-zinc-500 text-sm">
            {lang === "zh"
              ? `共 ${total} 件商品`
              : lang === "en"
                ? `${total} products`
                : lang === "ko"
                  ? `총 ${total}개 상품`
                  : lang === "th"
                    ? `สินค้าทั้งหมด ${total} รายการ`
                    : lang === "id"
                      ? `${total} produk`
                      : lang === "vi"
                        ? `${total} sản phẩm`
                        : `全 ${total} 商品`}
          </p>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm text-zinc-500">
            {lang === "zh" ? "排序:" : lang === "en" ? "Sort:" : "並び替え:"}
          </span>
          {[
            { key: "createdAt_desc", labelZh: "最新", labelEn: "Newest", labelJa: "新着" },
            { key: "price_asc", labelZh: "价格从低到高", labelEn: "Price: Low to High", labelJa: "価格の安い順" },
            { key: "price_desc", labelZh: "价格从高到低", labelEn: "Price: High to Low", labelJa: "価格の高い順" },
            { key: "rating_desc", labelZh: "评分最高", labelEn: "Highest Rated", labelJa: "評価の高い順" },
            { key: "sales_desc", labelZh: "销量最高", labelEn: "Best Selling", labelJa: "売れ筋順" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => handleSortChange(s.key)}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors ${
                sort === s.key
                  ? "bg-rose-600 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:border-rose-200"
              }`}
            >
              {lang === "zh"
                ? s.labelZh
                : lang === "en"
                  ? (s as any).labelEn || s.labelZh
                  : (s as any).labelJa || s.labelZh}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {products.length === 0 && !loading ? (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 text-zinc-300 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
            <p className="text-zinc-500">
              {lang === "zh"
                ? "该分类下暂无商品"
                : lang === "en"
                  ? "No products in this category"
                  : "このカテゴリに商品はありません"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="relative h-40 bg-muted">
                      {product.images && product.images[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          {lang === "zh" ? "无图片" : "No Image"}
                        </div>
                      )}
                      <Badge
                        className={`absolute top-2 left-2 ${PLATFORM_COLORS[product.platform] || "bg-gray-500"} text-white text-xs`}
                      >
                        {product.platformName}
                      </Badge>
                      {!product.inStock && (
                        <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                          {lang === "zh" ? "售罄" : "Sold Out"}
                        </Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm line-clamp-2 mb-1 min-h-[2.5rem]">
                        {product.title}
                      </h4>
                      {product.rating && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-yellow-500 text-xs">★</span>
                          <span className="text-xs">
                            {Number(product.rating).toFixed(1)}
                          </span>
                        </div>
                      )}
                      <p className="text-base font-bold text-rose-600">
                        {getPriceByCurrency(product)}
                      </p>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8"
                >
                  {loadingMore
                    ? lang === "zh"
                      ? "加载中..."
                      : "Loading..."
                    : lang === "zh"
                      ? "加载更多"
                      : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
