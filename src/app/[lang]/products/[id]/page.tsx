"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Link } from "@/i18n/navigation";

interface Product {
  id: string;
  platform: string;
  platformName: string;
  platformProductId: string;
  platformUrl: string;
  title: string;
  titleZh: string;
  titleEn: string;
  titleJa: string;
  description: string;
  descriptionZh: string;
  descriptionEn: string;
  descriptionJa: string;
  priceJpy: number;
  priceCny: number;
  priceUsd: number;
  currency: string;
  exchangeRateUsed: number;
  images: string[];
  imagesCount: number;
  categoryId: string;
  category: any;
  status: string;
  rating: number | null;
  reviewCount: number;
  salesCount: number;
  specifications: Record<string, any>;
  sellerId: string;
  sellerName: string;
  slug: string;
  inStock: boolean;
  lastSyncedAt: string;
}

interface PriceHistory {
  productId: string;
  currency: string;
  history: { date: string; price: number }[];
  statistics: {
    currentPrice: number;
    lowestPrice: number;
    highestPrice: number;
    averagePrice: number;
    priceTrend: "up" | "down" | "stable";
  };
}

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProduct();
    fetchPriceHistory();
  }, [productId, lang]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await api.getProduct(productId, lang);
      if (res.success && res.data) {
        const data = res.data as Product;
        setProduct(data);
        if (data.images && data.images.length > 0) {
          setSelectedImage(0);
        }
        // Fetch related products from same category
        if (data.categoryId) {
          fetchRelatedProducts(data.categoryId);
        }
      }
    } catch (error) {
      console.error("Failed to fetch product:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPriceHistory = async () => {
    try {
      const res = await api.getPriceHistory(productId, 30, lang === "ja" ? "JPY" : lang === "en" ? "USD" : "CNY");
      if (res.success && res.data) {
        setPriceHistory(res.data as PriceHistory);
      }
    } catch (error) {
      console.error("Failed to fetch price history:", error);
    }
  };

  const fetchRelatedProducts = async (categoryId: string) => {
    try {
      const res = await api.getCategoryProducts(categoryId, { lang, limit: 5 });
      if (res.success && res.data && typeof res.data === 'object') {
        const data = res.data as any;
        setRelatedProducts((Array.isArray(data.data) ? data.data : []).filter((p: Product) => p.id !== productId).slice(0, 4));
      }
    } catch (error) {
      console.error("Failed to fetch related products:", error);
    }
  };

  const getPriceByCurrency = (priceJpy: number, priceCny: number, priceUsd: number) => {
    switch (lang) {
      case "en":
        return { main: `$${priceUsd.toFixed(2)}`, secondary: `¥${priceJpy.toLocaleString()}` };
      case "ja":
        return { main: `¥${priceJpy.toLocaleString()}`, secondary: `¥${priceCny.toFixed(2)}` };
      default:
        return { main: `¥${priceCny.toFixed(2)}`, secondary: `¥${priceJpy.toLocaleString()}` };
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return "↑";
      case "down":
        return "↓";
      default:
        return "→";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-red-500";
      case "down":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {lang === "zh" ? "商品未找到" : lang === "en" ? "Product Not Found" : "商品が見つかりません"}
        </h1>
        <Button onClick={() => router.back()}>
          {lang === "zh" ? "返回" : lang === "en" ? "Go Back" : "戻る"}
        </Button>
      </div>
    );
  }

  const priceDisplay = getPriceByCurrency(product.priceJpy, product.priceCny, product.priceUsd);

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-muted-foreground">
          <li>
            <Link href="/" className="hover:text-primary">
              {lang === "zh" ? "首页" : lang === "en" ? "Home" : "ホーム"}
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/products" className="hover:text-primary">
              {lang === "zh" ? "商品" : lang === "en" ? "Products" : "商品"}
            </Link>
          </li>
          {product.category && (
            <>
              <li>/</li>
              <li className="hover:text-primary cursor-pointer" onClick={() => router.push(`/products?category=${product.categoryId}`)}>
                {product.category.name}
              </li>
            </>
          )}
          <li>/</li>
          <li className="text-foreground truncate max-w-[200px]">{product.title}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden mb-4">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[selectedImage]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                {lang === "zh" ? "无图片" : lang === "en" ? "No Image" : "画像なし"}
              </div>
            )}
            {/* Platform Badge */}
            <Badge
              className={`absolute top-4 left-4 ${PLATFORM_COLORS[product.platform] || "bg-gray-500"} text-white`}
            >
              {product.platformName}
            </Badge>
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden border-2 ${
                    selectedImage === idx ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={img} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4">{product.title}</h1>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mb-6">
            {product.rating && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500 text-lg">★</span>
                <span className="font-medium">{Number(product.rating).toFixed(1)}</span>
                <span className="text-muted-foreground">({product.reviewCount} {lang === "zh" ? "评论" : lang === "en" ? "reviews" : "レビュー"})</span>
              </div>
            )}
            {product.salesCount > 0 && (
              <div className="text-muted-foreground">
                {lang === "zh" ? "销量" : lang === "en" ? "Sales" : "売上"}: {product.salesCount}
              </div>
            )}
            <Badge variant={product.inStock ? "default" : "destructive"}>
              {product.inStock
                ? lang === "zh" ? "有货" : lang === "en" ? "In Stock" : "在庫あり"
                : lang === "zh" ? "售罄" : lang === "en" ? "Sold Out" : "売り切れ"}
            </Badge>
          </div>

          {/* Price */}
          <div className="bg-muted/50 rounded-lg p-6 mb-6">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-primary">{priceDisplay.main}</span>
              {lang !== "ja" && (
                <span className="text-lg text-muted-foreground">{priceDisplay.secondary} JPY</span>
              )}
            </div>
            {product.exchangeRateUsed > 0 && (
              <p className="text-sm text-muted-foreground">
                {lang === "zh" ? "汇率" : lang === "en" ? "Exchange Rate" : "為替レート"}: 1 JPY = ¥{Number(product.exchangeRateUsed).toFixed(4)}
              </p>
            )}
            {priceHistory && (
              <div className={`flex items-center gap-2 mt-2 ${getTrendColor(priceHistory.statistics.priceTrend)}`}>
                <span>{getTrendIcon(priceHistory.statistics.priceTrend)}</span>
                <span className="text-sm">
                  {lang === "zh"
                    ? priceHistory.statistics.priceTrend === "up"
                      ? "价格上涨中"
                      : priceHistory.statistics.priceTrend === "down"
                      ? "价格下降中"
                      : "价格稳定"
                    : lang === "en"
                    ? priceHistory.statistics.priceTrend === "up"
                      ? "Price trending up"
                      : priceHistory.statistics.priceTrend === "down"
                      ? "Price trending down"
                      : "Price stable"
                    : priceHistory.statistics.priceTrend === "up"
                    ? "価格上昇中"
                    : priceHistory.statistics.priceTrend === "down"
                    ? "価格下落中"
                    : "価格安定"}
                </span>
              </div>
            )}
          </div>

          {/* Seller Info */}
          {product.sellerName && (
            <div className="mb-4">
              <span className="text-muted-foreground">
                {lang === "zh" ? "卖家" : lang === "en" ? "Seller" : "卖家"}: {product.sellerName}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {product.platformUrl && (
              <a href={product.platformUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full" size="lg">
                  {lang === "zh" ? "在平台查看" : lang === "en" ? "View on Platform" : "プラットフォームで見る"}
                </Button>
              </a>
            )}
            <Link href={`/compare?ids=${product.id}`}>
              <Button variant="outline" className="w-full" size="lg">
                {lang === "zh" ? "比价" : lang === "en" ? "Compare Price" : "価格比較"}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="mb-12">
        <TabsList>
          <TabsTrigger value="details">
            {lang === "zh" ? "商品详情" : lang === "en" ? "Details" : "商品詳細"}
          </TabsTrigger>
          <TabsTrigger value="specs">
            {lang === "zh" ? "规格参数" : lang === "en" ? "Specifications" : "仕様"}
          </TabsTrigger>
          <TabsTrigger value="price-history">
            {lang === "zh" ? "价格历史" : lang === "en" ? "Price History" : "価格履歴"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {lang === "zh" ? "商品描述" : lang === "en" ? "Description" : "説明"}
            </h3>
            <div className="prose prose-sm max-w-none">
              {product.description ? (
                <p className="whitespace-pre-wrap">{product.description}</p>
              ) : (
                <p className="text-muted-foreground">
                  {lang === "zh" ? "暂无描述" : lang === "en" ? "No description available" : "説明がありません"}
                </p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="specs" className="mt-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {lang === "zh" ? "规格参数" : lang === "en" ? "Specifications" : "仕様"}
            </h3>
            {product.specifications && Object.keys(product.specifications).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex border-b py-2">
                    <span className="font-medium w-1/3">{key}</span>
                    <span className="text-muted-foreground w-2/3">{String(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                {lang === "zh" ? "暂无规格参数" : lang === "en" ? "No specifications available" : "仕様情報がありません"}
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="price-history" className="mt-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {lang === "zh" ? "价格历史 (30天)" : lang === "en" ? "Price History (30 Days)" : "価格履歴（30日）"}
            </h3>
            {priceHistory ? (
              <>
                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      {lang === "zh" ? "当前价格" : lang === "en" ? "Current" : "現在"}
                    </p>
                    <p className="text-xl font-bold">¥{priceHistory.statistics.currentPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      {lang === "zh" ? "最低价" : lang === "en" ? "Lowest" : "最安"}
                    </p>
                    <p className="text-xl font-bold text-green-600">¥{priceHistory.statistics.lowestPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      {lang === "zh" ? "最高价" : lang === "en" ? "Highest" : "最高"}
                    </p>
                    <p className="text-xl font-bold text-red-600">¥{priceHistory.statistics.highestPrice.toFixed(2)}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      {lang === "zh" ? "平均价格" : lang === "en" ? "Average" : "平均"}
                    </p>
                    <p className="text-xl font-bold">¥{priceHistory.statistics.averagePrice.toFixed(2)}</p>
                  </div>
                </div>

                {/* Simple Chart */}
                {priceHistory.history.length > 0 ? (
                  <div className="h-48 flex items-end gap-1">
                    {priceHistory.history.map((point, idx) => {
                      const min = priceHistory.statistics.lowestPrice;
                      const max = priceHistory.statistics.highestPrice;
                      const height = max > min ? ((point.price - min) / (max - min)) * 100 : 50;
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-primary/80 rounded-t"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${point.date}: ¥${point.price.toFixed(2)}`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    {lang === "zh" ? "暂无价格历史数据" : lang === "en" ? "No price history available" : "価格履歴がありません"}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                {lang === "zh" ? "加载中..." : lang === "en" ? "Loading..." : "読み込み中..."}
              </p>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">
            {lang === "zh" ? "相关商品" : lang === "en" ? "Related Products" : "関連商品"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map((p) => {
              const priceD = getPriceByCurrency(p.priceJpy, p.priceCny, p.priceUsd);
              return (
                <Link key={p.id} href={`/products/${p.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="relative h-40 bg-muted">
                      {p.images && p.images[0] ? (
                        <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                          {lang === "zh" ? "无图片" : lang === "en" ? "No Image" : "画像なし"}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-2">{p.title}</h3>
                      <p className="text-lg font-bold text-primary">{priceD.main}</p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
