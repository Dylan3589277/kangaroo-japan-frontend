"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface ComparedProduct {
  id: string;
  platform: string;
  platformName: string;
  platformUrl: string;
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
  sellerName: string;
}

interface CompareResult {
  products: ComparedProduct[];
  cheapest: {
    platform: string;
    priceCny: number;
    priceJpy: number;
    savingsCny: number;
    savingsPercent: number;
  } | null;
}

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

const PLATFORM_NAMES: Record<string, Record<string, string>> = {
  amazon: { zh: "亚马逊", en: "Amazon", ja: "Amazon" },
  mercari: { zh: "Mercari", en: "Mercari", ja: "Mercari" },
  rakuten: { zh: "乐天", en: "Rakuten", ja: "楽天" },
  yahoo: { zh: "Yahoo", en: "Yahoo", ja: "Yahoo" },
};

function CompareContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params.lang as string) || "zh";

  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [productIds, setProductIds] = useState<string[]>([]);

  useEffect(() => {
    const ids = searchParams.get("ids");
    if (ids) {
      const idArray = ids.split(",").filter(Boolean);
      setProductIds(idArray);
      fetchCompare(idArray);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchCompare = async (ids: string[]) => {
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.compareProducts(ids, lang);
      if (res.success && res.data) {
        setCompareResult(res.data as CompareResult);
      }
    } catch (error) {
      console.error("Failed to fetch compare:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPriceByCurrency = (priceJpy: number, priceCny: number, priceUsd: number) => {
    switch (lang) {
      case "en":
        return { main: `$${priceUsd.toFixed(2)}`, secondary: `¥${priceJpy.toLocaleString()}` };
      case "ja":
        return { main: `¥${priceJpy.toLocaleString()}`, secondary: `(¥${priceCny.toFixed(2)})` };
      default:
        return { main: `¥${priceCny.toFixed(2)}`, secondary: `¥${priceJpy.toLocaleString()}` };
    }
  };

  const getCheapestPlatform = () => {
    if (!compareResult?.cheapest) return null;
    return PLATFORM_NAMES[compareResult.cheapest.platform]?.[lang] || compareResult.cheapest.platform;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (productIds.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {lang === "zh" ? "请选择要比较的商品" : lang === "en" ? "Please select products to compare" : "比較する商品を選択してください"}
        </h1>
        <Link href="/products">
          <Button>
            {lang === "zh" ? "浏览商品" : lang === "en" ? "Browse Products" : "商品を見る"}
          </Button>
        </Link>
      </div>
    );
  }

  if (!compareResult || compareResult.products.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {lang === "zh" ? "未找到商品" : lang === "en" ? "Products Not Found" : "商品が見つかりません"}
        </h1>
        <Link href="/products">
          <Button>
            {lang === "zh" ? "浏览商品" : lang === "en" ? "Browse Products" : "商品を見る"}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {lang === "zh" ? "商品比价" : lang === "en" ? "Price Comparison" : "価格比較"}
        </h1>
        <p className="text-muted-foreground">
          {lang === "zh"
            ? "比较同一商品在不同平台的价格"
            : lang === "en"
            ? "Compare prices for the same product across different platforms"
            : "同じ商品の異なるプラットフォームでの価格を比較"}
        </p>
      </div>

      {/* Cheapest Summary */}
      {compareResult.cheapest && (
        <Card className="mb-8 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-1">
                  {lang === "zh" ? "最低价" : lang === "en" ? "Best Price" : "最安値"}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge className={`${PLATFORM_COLORS[compareResult.cheapest.platform]} text-white text-lg px-3 py-1`}>
                    {getCheapestPlatform()}
                  </Badge>
                  <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                    ¥{compareResult.cheapest.priceCny.toFixed(2)}
                  </span>
                </div>
              </div>
              {compareResult.cheapest.savingsCny > 0 && (
                <div className="text-right">
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {lang === "zh" ? "可节省" : lang === "en" ? "You save" : "節約可能"}
                  </p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">
                    ¥{compareResult.cheapest.savingsCny.toFixed(2)} ({compareResult.cheapest.savingsPercent}%)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {compareResult.products.map((product) => {
          const priceDisplay = getPriceByCurrency(product.priceJpy, product.priceCny, product.priceUsd);
          const isCheapest = compareResult.cheapest?.platform === product.platform;

          return (
            <Card
              key={product.id}
              className={`overflow-hidden ${
                isCheapest ? "border-green-500 border-2 shadow-lg" : ""
              }`}
            >
              {isCheapest && (
                <div className="bg-green-500 text-white text-center py-1 text-sm font-medium">
                  {lang === "zh" ? "最低价 ✓" : lang === "en" ? "Best Price ✓" : "最安値 ✓"}
                </div>
              )}

              {/* Image */}
              <div className="relative h-48 bg-muted">
                {product.images && product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    {lang === "zh" ? "无图片" : lang === "en" ? "No Image" : "画像なし"}
                  </div>
                )}
                <Badge
                  className={`absolute top-3 left-3 ${PLATFORM_COLORS[product.platform] || "bg-gray-500"} text-white`}
                >
                  {product.platformName}
                </Badge>
              </div>

              <CardContent className="p-4">
                {/* Title */}
                <h3 className="font-medium line-clamp-2 mb-3 min-h-[3rem]">{product.title}</h3>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-2xl font-bold text-primary">{priceDisplay.main}</span>
                  {lang !== "ja" && (
                    <span className="text-sm text-muted-foreground ml-2">{priceDisplay.secondary}</span>
                  )}
                  {lang === "ja" && (
                    <span className="text-sm text-muted-foreground ml-1">{priceDisplay.secondary}</span>
                  )}
                </div>

                {/* Meta */}
                <div className="space-y-2 mb-4 text-sm">
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span>{Number(product.rating).toFixed(1)}</span>
                      <span className="text-muted-foreground">({product.reviewCount})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={product.inStock ? "default" : "destructive"} className="text-xs">
                      {product.inStock
                        ? lang === "zh" ? "有货" : lang === "en" ? "In Stock" : "在庫あり"
                        : lang === "zh" ? "售罄" : lang === "en" ? "Sold Out" : "売り切れ"}
                    </Badge>
                    {product.salesCount > 0 && (
                      <span className="text-muted-foreground">
                        {lang === "zh" ? "销量" : lang === "en" ? "Sales" : "売上"}: {product.salesCount}
                      </span>
                    )}
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {product.platformUrl && (
                    <a href={product.platformUrl} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full" size="sm">
                        {lang === "zh" ? "去购买" : lang === "en" ? "Buy Now" : "購入"}
                      </Button>
                    </a>
                  )}
                  <Link href={`/products/${product.id}`}>
                    <Button variant="outline" className="w-full" size="sm">
                      {lang === "zh" ? "查看详情" : lang === "en" ? "View Details" : "詳細を見る"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            {lang === "zh" ? "详细对比" : lang === "en" ? "Detailed Comparison" : "詳細比較"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">
                    {lang === "zh" ? "平台" : lang === "en" ? "Platform" : "プラットフォーム"}
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    {lang === "zh" ? "价格" : lang === "en" ? "Price" : "価格"}
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    {lang === "zh" ? "评分" : lang === "en" ? "Rating" : "評価"}
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    {lang === "zh" ? "评论数" : lang === "en" ? "Reviews" : "レビュー数"}
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    {lang === "zh" ? "销量" : lang === "en" ? "Sales" : "売上"}
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    {lang === "zh" ? "状态" : lang === "en" ? "Status" : "状態"}
                  </th>
                  <th className="text-right py-3 px-4 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {compareResult.products.map((product) => {
                  const priceDisplay = getPriceByCurrency(product.priceJpy, product.priceCny, product.priceUsd);
                  const isCheapest = compareResult.cheapest?.platform === product.platform;

                  return (
                    <tr
                      key={product.id}
                      className={`border-b ${isCheapest ? "bg-green-50 dark:bg-green-950/30" : ""}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Badge className={`${PLATFORM_COLORS[product.platform]} text-white`}>
                            {product.platformName}
                          </Badge>
                          {isCheapest && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              {lang === "zh" ? "最低" : lang === "en" ? "Best" : "最安"}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className="font-bold">{priceDisplay.main}</span>
                        <span className="text-sm text-muted-foreground ml-1">{priceDisplay.secondary}</span>
                      </td>
                      <td className="text-right py-3 px-4">
                        {product.rating ? (
                          <span className="text-yellow-500">★</span>
                        ) : (
                          "-"
                        )}{" "}
                        {product.rating ? Number(product.rating).toFixed(1) : "-"}
                      </td>
                      <td className="text-right py-3 px-4">{product.reviewCount || "-"}</td>
                      <td className="text-right py-3 px-4">{product.salesCount || "-"}</td>
                      <td className="text-right py-3 px-4">
                        <Badge variant={product.inStock ? "default" : "destructive"}>
                          {product.inStock
                            ? lang === "zh" ? "有货" : lang === "en" ? "In Stock" : "在庫"
                            : lang === "zh" ? "售罄" : lang === "en" ? "Sold Out" : "売り切れ"}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4">
                        <Link href={`/products/${product.id}`}>
                          <Button variant="ghost" size="sm">
                            {lang === "zh" ? "详情" : lang === "en" ? "Details" : "詳細"}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      <div className="text-center">
        <Link href="/products">
          <Button variant="outline">
            {lang === "zh" ? "返回商品列表" : lang === "en" ? "Back to Products" : "商品リストに戻る"}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="h-12 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-full" />
          ))}
        </div>
      </div>
    }>
      <CompareContent />
    </Suspense>
  );
}
