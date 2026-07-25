"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { extractProducts } from "@/lib/product-utils";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "bg-yellow-500",
  mercari: "bg-red-500",
  rakuten: "bg-red-600",
  yahoo: "bg-purple-500",
};

export function HomePageClient() {
  const t = useTranslations();
  const pathname = usePathname();
  const params = useParams();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, user } = useAuthStore();

  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [latestProducts, setLatestProducts] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { key: "home", href: "/", label: t("nav.home") },
    { key: "products", href: "/products", label: t("nav.products") },
    { key: "cart", href: "/cart", label: t("nav.cart") },
    { key: "compare", href: "/compare", label: t("home.priceCompare") },
  ];

  const getAuthNav = () => {
    if (isAuthenticated) {
      return [
        { key: "orders", href: "/orders", label: t("nav.orders") },
        { key: "profile", href: "/profile", label: user?.name || t("nav.profile") },
      ];
    }
    return [
      { key: "login", href: "/login", label: t("auth.login") },
      { key: "register", href: "/register", label: t("auth.register") },
    ];
  };

  const switchLocale = (newLocale: string) => {
    // Remove current locale prefix from pathname
    const currentPath = pathname.replace(/^\/(zh|en)/, '') || '/';
    return `/${newLocale}${currentPath === "/" ? "" : currentPath}`;
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [lang]);

  const fetchCategories = async () => {
    try {
      const res = await api.getCategories(lang);
      if (res.success && res.data && Array.isArray(res.data)) {
        setCategories(res.data.slice(0, 8));
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchProducts = async () => {
    try {
      // Featured products (sorted by rating)
      const featuredRes = await api.getProducts({ lang, limit: 4, sort: "rating_desc" });
      if (featuredRes.success && featuredRes.data && typeof featuredRes.data === "object") {
        const data = featuredRes.data as any;
        setFeaturedProducts(extractProducts(data).slice(0, 4));
      }

      // Latest products
      const latestRes = await api.getProducts({ lang, limit: 8, sort: "createdAt_desc" });
      if (latestRes.success && latestRes.data && typeof latestRes.data === "object") {
        const data = latestRes.data as any;
        setLatestProducts(extractProducts(data).slice(0, 8));
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const router = useRouter();

  // SEO: Dynamic title & BreadcrumbList structured data
  useEffect(() => {
    const pageTitle = `${t("home.title")} | JP Buy`;
    document.title = pageTitle;
    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", t("home.subtitle"));
  }, [t]);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: lang === "zh" ? "首页" : lang === "en" ? "Home" : "ホーム",
        item: `https://jp-buy.com/${lang}`,
      },
    ],
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

  const authNavItems = getAuthNav();

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* BreadcrumbList JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-rose-50 to-orange-50 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 text-center">
          {isAuthenticated && user && (
            <p className="text-rose-600 font-medium mb-3">
              {t("profile.welcomeBack")}, {user.name}！
            </p>
          )}
          <h2 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-4">{t("home.title")}</h2>
          <p className="text-lg text-zinc-600 mb-8 max-w-2xl mx-auto">{t("home.subtitle")}</p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder={t("home.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-12 px-6 pr-32 rounded-full border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-5 bg-rose-600 text-white text-sm font-medium rounded-full hover:bg-rose-700 transition-colors"
              >
                {t("products.searchBtn")}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* How it works: 4 步流程 + 费用构成一句话（信任/透明） */}
      <section className="py-12 bg-white border-b">
        <div className="mx-auto max-w-7xl px-4">
          <h3 className="text-xl font-bold text-zinc-900 text-center mb-8">
            {lang === "zh" ? "四步，把日本好物买回家" : lang === "en" ? "How it works — 4 simple steps" : "ご利用の流れ（4ステップ）"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                zh: ["搜索或粘贴链接", "支持 Mercari、Yahoo!拍卖、亚马逊等日本平台"],
                en: ["Search or paste a link", "Mercari and Yahoo! Auctions"],
                ja: ["検索またはリンクを貼付", "メルカリ・Yahoo!オークション・Amazonなどに対応"],
              },
              {
                zh: ["下单支付", "我们在日本替您购买；若未买到，款项全额退还"],
                en: ["Order & pay", "We buy it in Japan for you; full refund if the purchase fails"],
                ja: ["注文・お支払い", "日本で代理購入。買付不成立の場合は全額返金"],
              },
              {
                zh: ["到仓验货合箱", "商品寄到日本仓库人工验货，多件可合箱省运费"],
                en: ["Inspected & consolidated", "Items are checked by hand at our Japan warehouse and can be combined into one parcel"],
                ja: ["倉庫で検品・合梱", "日本倉庫でスタッフが検品。複数商品はおまとめ可能"],
              },
              {
                zh: ["称重发货", "到仓称重后支付国际运费，直发您的地址"],
                en: ["Weighed & shipped", "Pay international shipping by actual weight, delivered to your door"],
                ja: ["計量・発送", "実重量で国際送料を計算し、ご自宅へお届け"],
              },
            ].map((step, i) => (
              <div
                key={i}
                className="rounded-xl bg-white border shadow-sm p-5 text-center"
              >
                <div className="mx-auto mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 text-white text-sm font-bold">
                  {i + 1}
                </div>
                <p className="font-medium text-zinc-900 mb-1">
                  {lang === "zh" ? step.zh[0] : lang === "en" ? step.en[0] : step.ja[0]}
                </p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {lang === "zh" ? step.zh[1] : lang === "en" ? step.en[1] : step.ja[1]}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-zinc-600 mt-6">
            {lang === "zh"
              ? "总费用 = 商品价格 + 服务费 + 国际运费（到仓称重后确定），下单前每一项都看得清。"
              : lang === "en"
              ? "Total = item price + service fee + international shipping (set after weighing at our warehouse) — every line is shown before you order."
              : "合計 = 商品価格 + 手数料 + 国際送料（倉庫での計量後に確定）。ご注文前にすべての内訳をご確認いただけます。"}
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-zinc-900">{t("home.categories")}</h3>
            <Link
              href="/products"
              className="text-sm text-rose-600 hover:text-rose-700 font-medium"
            >
              {lang === "zh" ? "查看全部 →" : lang === "en" ? "View all →" : "すべて見る →"}
            </Link>
          </div>

          {loadingCategories ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((cat, i) => (
                <Link
                  key={cat.id || i}
                  href={`/products?categoryId=${cat.id}`}
                  className="flex items-center justify-center h-24 rounded-xl bg-white border shadow-sm hover:shadow-md hover:border-rose-200 transition-all text-zinc-700 font-medium"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { zh: "电子产品", en: "Electronics", ja: "家電製品" },
                { zh: "服装时尚", en: "Fashion", ja: "ファッション" },
                { zh: "家居用品", en: "Home & Living", ja: "ホーム用品" },
                { zh: "美妆护肤", en: "Beauty", ja: "コスメ" },
              ].map((cat, i) => (
                <Link
                  key={i}
                  href={`/products?category=${i}`}
                  className="flex items-center justify-center h-24 rounded-xl bg-white border shadow-sm hover:shadow-md hover:border-rose-200 transition-all"
                >
                  <span className="font-medium text-zinc-700">
                    {lang === "zh" ? cat.zh : lang === "en" ? cat.en : cat.ja}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-zinc-900">{t("home.featured")}</h3>
            <Link
              href="/products?sort=rating_desc"
              className="text-sm text-rose-600 hover:text-rose-700 font-medium"
            >
              {lang === "zh" ? "查看全部 →" : lang === "en" ? "View all →" : "すべて見る →"}
            </Link>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="relative h-16 bg-zinc-100">
                      <Badge
                        className={`absolute top-2 left-2 ${PLATFORM_COLORS[product.platform] || "bg-gray-500"} text-white text-xs`}
                      >
                        {product.platformName}
                      </Badge>
                      {!product.inStock && (
                        <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                          {t("product.outOfStock")}
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
                          <span className="text-xs">{Number(product.rating).toFixed(1)}</span>
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
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {lang === "zh" ? "暂无精选商品" : lang === "en" ? "No featured products" : "おすすめ商品はありません"}
            </p>
          )}
        </div>
      </section>

      {/* Latest Products */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-zinc-900">
              {lang === "zh" ? "最新商品" : lang === "en" ? "Latest Products" : "新着商品"}
            </h3>
            <Link
              href="/products?sort=createdAt_desc"
              className="text-sm text-rose-600 hover:text-rose-700 font-medium"
            >
              {lang === "zh" ? "查看全部 →" : lang === "en" ? "View all →" : "すべて見る →"}
            </Link>
          </div>

          {loadingProducts ? (
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
          ) : latestProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {latestProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="relative h-16 bg-zinc-100">
                      <Badge
                        className={`absolute top-2 left-2 ${PLATFORM_COLORS[product.platform] || "bg-gray-500"} text-white text-xs`}
                      >
                        {product.platformName}
                      </Badge>
                      {!product.inStock && (
                        <Badge variant="destructive" className="absolute top-2 right-2 text-xs">
                          {t("product.outOfStock")}
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
                          <span className="text-xs">{Number(product.rating).toFixed(1)}</span>
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
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {lang === "zh" ? "暂无最新商品" : lang === "en" ? "No products available" : "商品がありません"}
            </p>
          )}
        </div>
      </section>

      {/* Platform Banner */}
      <section className="py-12 bg-gradient-to-r from-rose-600 to-orange-500">
        <div className="mx-auto max-w-7xl px-4 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">
            {lang === "zh" ? "汇聚日本三大电商平台" : lang === "en" ? "Compare Top 3 Japanese Platforms" : "日本3大ECプラットフォーム比較"}
          </h3>
          <p className="text-white/80 mb-6">
            {lang === "zh" ? "Amazon · Mercari · Yahoo" : lang === "en" ? "Amazon · Mercari · Yahoo" : "Amazon · Mercari · Yahoo"}
          </p>
          <Link href="/compare">
            <Button className="bg-white text-rose-600 hover:bg-zinc-100 font-semibold px-8">
              {t("home.priceCompare")}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-zinc-500">
          <div className="flex justify-center gap-6 mb-4">
            <a href="/contact" className="hover:text-rose-600 transition-colors">联系客服</a>
            <a href="/faq" className="hover:text-rose-600 transition-colors">FAQ</a>
            <a href="/about" className="hover:text-rose-600 transition-colors">关于我们</a>
          </div>
          <p>© 2026 Kangaroo Japan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

