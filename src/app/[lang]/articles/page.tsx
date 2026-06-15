"use client";
import { useTranslations } from "next-intl";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import Image from "next/image";
import { Calendar, Eye } from "lucide-react";

interface ArticleItem {
  id: number;
  title: string;
  summary: string;
  category_id: number;
  category_name: string;
  cover_image: string;
  add_time: string;
  view_count: number;
}

interface ArticleData {
  list: ArticleItem[];
  totalPages: number;
}

const CATEGORIES = [
  { id: 0, labelKey: "all" },
  { id: 1, labelKey: "shoppingGuide" },
  { id: 2, labelKey: "japanTravel" },
  { id: 3, labelKey: "recommendations" },
  { id: 4, labelKey: "proxyNews" },
  { id: 5, labelKey: "japanCulture" },
];


function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function ArticlesPage() {
  const t = useTranslations('articles');
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  const fetchArticles = useCallback(
    async (pageNum: number, categoryId: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      }
      // Note: non-append loading state is managed by the caller (useEffect)

      try {
        const res = await api.request("/articles/index", {
          method: "POST",
          body: {
            page: pageNum,
            pageSize: 10,
            category_id: categoryId > 0 ? categoryId : undefined,
          },
        });
        if (res.success && res.data) {
          const d = res.data as Partial<ArticleData>;
          const items = d.list || [];
          const pages = d.totalPages || 1;
          if (append) {
            setArticles((prev) => [...prev, ...items]);
          } else {
            setArticles(items);
          }
          setTotalPages(pages);
          return;
        }
      } catch {
        // Production must show only backend article data.
      }

      if (!append) {
        setArticles([]);
      }
      setTotalPages(1);
    },
    []
  );

  // Track category changes to reset pagination
  const categoryRef = useRef(activeCategory);

  useEffect(() => {
    let active = true;

    const initialFetch = async () => {
      setLoading(true);
      try {
        if (categoryRef.current !== activeCategory) {
          categoryRef.current = activeCategory;
          await fetchArticles(1, activeCategory);
          if (active) {
            setPage(1);
          }
        } else {
          await fetchArticles(1, activeCategory);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void initialFetch();

    return () => {
      active = false;
    };
  }, [activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchArticles(nextPage, activeCategory, true);
  };

  const handleCategoryChange = (value: string) => {
    setActiveCategory(Number(value));
  };

  const hasMore = page < totalPages;

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs
          value={String(activeCategory)}
          onValueChange={handleCategoryChange}
          className="mb-6"
        >
          <TabsList className="w-full justify-start overflow-x-auto">
            {CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={String(cat.id)}
                className="flex-shrink-0"
              >
                {t(cat.labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Loading */}
        {loading && articles.length === 0 && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex gap-4">
                  <Skeleton className="w-32 h-24 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-4">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && articles.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">--</div>
            <h2 className="text-xl font-bold mb-2">
              {t('noArticles')}
            </h2>
            <p className="text-muted-foreground">
              {t('noArticlesCategory')}
            </p>
          </div>
        )}

        {/* Article List */}
        <div className="space-y-4">
          {articles.map((article) => (
            <Card
              key={article.id}
              className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/${lang}/articles/${article.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {/* Cover image */}
                  {article.cover_image && (
                    <div className="w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0 relative">
                      <Image
                        src={article.cover_image}
                        alt={article.title}
                        fill
                        className="object-cover"
                        sizes="144px"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {article.summary}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">
                        {article.category_name}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {formatDate(article.add_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="size-3" />
                        {article.view_count}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center pt-6 pb-10">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore
                ? t('loading')
                : t('loadMore')}
            </Button>
          </div>
        )}

        {!hasMore && articles.length > 0 && (
          <p className="text-center text-sm text-muted-foreground pt-4 pb-10">
            {t('allLoaded')}
          </p>
        )}
      </main>
    </div>
  );
}
