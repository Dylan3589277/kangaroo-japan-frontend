"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

export default function NotFoundPage() {
  const t = useTranslations();
  const params = useParams();
  const lang = (params.lang as string) || "zh";
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommended();
  }, [lang]);

  const fetchRecommended = async () => {
    try {
      const res = await api.getProducts({ lang, limit: 4, sort: "rating_desc" });
      if (res.success && res.data && typeof res.data === "object") {
        const data = res.data as any;
        setRecommendedProducts(Array.isArray(data.data) ? data.data.slice(0, 4) : []);
      }
    } catch (err) {
      console.error("Failed to fetch recommended products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/${lang}/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getPriceByCurrency = (product: any) => {
    switch (lang) {
      case "en":
        return `$${Number(product.priceUsd).toFixed(2)}`;
      case "ja":
        return `¥${Number(product.priceJpy).toLocaleString()}`;
      default:
        return `¥${Number(product.priceCny).toFixed(2)}`;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Header showSearch />

      <main className="flex-1 flex flex-col items-center justify-center py-16 md:py-24 px-4">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
            <svg
              className="w-12 h-12 text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
        </div>

        {/* Error Text */}
        <h1 className="text-6xl md:text-8xl font-bold text-zinc-200 mb-4">404</h1>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-3">
          {t("notFound.title")}
        </h2>
        <p className="text-zinc-500 text-center max-w-md mb-8">
          {t("notFound.subtitle")}
        </p>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="w-full max-w-md mb-8"
        >
          <div className="relative">
            <input
              type="text"
              placeholder={t("notFound.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 px-6 pr-12 rounded-full border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </button>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-12">
          <Link href="/">
            <Button className="bg-rose-600 text-white hover:bg-rose-700 px-6">
              {t("notFound.goHome")}
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="px-6">
              {t("notFound.browseProducts")}
            </Button>
          </Link>
        </div>

        {/* Recommended Products */}
        {recommendedProducts.length > 0 && (
          <div className="w-full max-w-4xl">
            <h3 className="text-lg font-bold text-zinc-900 mb-4 text-center">
              {t("notFound.recommendedTitle")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="overflow-hidden">
                      <Skeleton className="h-36 w-full" />
                      <div className="p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </Card>
                  ))
                : recommendedProducts.map((product) => (
                    <Link key={product.id} href={`/products/${product.id}`}>
                      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                        <div className="relative h-36 bg-muted">
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
                              {t("product.noImage")}
                            </div>
                          )}
                          <Badge
                            className={`absolute top-2 left-2 ${PLATFORM_COLORS[product.platform] || "bg-gray-500"} text-white text-xs`}
                          >
                            {product.platformName}
                          </Badge>
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
          </div>
        )}
      </main>
    </div>
  );
}
