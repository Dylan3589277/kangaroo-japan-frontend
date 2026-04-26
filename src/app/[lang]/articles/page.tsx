"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
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
  { id: 0, name: { zh: "全部", ja: "すべて", en: "All" } },
  { id: 1, name: { zh: "购物攻略", ja: "買い物ガイド", en: "Shopping Guide" } },
  { id: 2, name: { zh: "日本旅游", ja: "日本旅行", en: "Japan Travel" } },
  { id: 3, name: { zh: "好物推荐", ja: "おすすめ商品", en: "Recommendations" } },
  { id: 4, name: { zh: "代购资讯", ja: "代購情報", en: "Agent News" } },
  { id: 5, name: { zh: "日本文化", ja: "日本文化", en: "Japanese Culture" } },
];

const MOCK_ARTICLES: ArticleItem[] = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  title: [
    "2024年日本药妆店必买清单TOP20",
    "日本中古店购物攻略：如何淘到高性价比好物",
    "东京最值得逛的10家买手店推荐",
    "日本小众护肤品牌盘点：不输大牌的宝藏好物",
    "代购必看：日本海关最新政策解读",
    "日本京都和服体验全攻略",
    "北海道白色恋人工厂参观记",
    "日本限定版球鞋购买指南",
    "日本药妆店和商场购物退税攻略",
    "大阪心斋桥购物全攻略",
    "日本二手奢侈品市场深度调研",
    "2024年日本最新人气零食排行榜",
  ][i],
  summary: [
    "每年都有无数新品上架，到底哪些是真正值得买的？本文为你整理了2024年日本药妆店最值得购买的20款产品...",
    "日本中古店藏着无数宝藏，但新手往往不知道怎么逛。这篇攻略教你如何从中古店淘到高性价比的好物...",
    "东京不仅是购物天堂，更是潮流文化的中心。本文精选了10家最值得逛的买手店，每一家都独具特色...",
    "日本除了知名大牌，还有很多低调但品质出众的小众护肤品牌。本文为你一一盘点这些宝藏品牌...",
    "日本海关政策经常变动，作为代购必须及时了解最新规定。本文详细解读当前日本海关的各项政策...",
    "京都的和服体验是日本旅游不可错过的项目。本文从和服选择、穿戴流程、拍照地点等方面全面介绍...",
    "白色恋人是日本最知名的伴手礼之一，但你知道它的制作过程吗？本文带你参观白色恋人工厂...",
    "日本是球鞋爱好者的天堂，很多限量版球鞋在日本更容易买到。本文教你如何在日本购买限定版球鞋...",
    "在日本购物如何退税？药妆店和商场的退税政策有什么区别？本文为你详细解答...",
    "大阪心斋桥是大阪最繁华的购物区，从药妆到奢侈品应有尽有。本文带你逛遍心斋桥...",
    "日本二手奢侈品市场规模巨大，性价比极高。本文深入分析了日本中古奢侈品市场的现状...",
    "日本的零食种类繁多，每年都有新口味上市。本文为你整理了2024年最受欢迎的日本零食...",
  ][i],
  category_id: (i % 5) + 1,
  category_name: ["购物攻略", "日本旅游", "好物推荐", "代购资讯", "日本文化"][i % 5],
  cover_image: `https://picsum.photos/seed/article${i + 1}/800/400`,
  add_time: new Date(Date.now() - i * 86400000 * 3).toISOString(),
  view_count: Math.floor(Math.random() * 5000) + 500,
}));

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function ArticlesPage() {
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
          const d = res.data as any;
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
        // Fallback to mock
      }

      // Mock data
      const pageSize = 10;
      const filtered =
        categoryId > 0
          ? MOCK_ARTICLES.filter((a) => a.category_id === categoryId)
          : MOCK_ARTICLES;
      const start = (pageNum - 1) * pageSize;
      const end = start + pageSize;
      const items = filtered.slice(start, end);
      const mockPages = Math.ceil(filtered.length / pageSize);

      if (append) {
        setArticles((prev) => [...prev, ...items]);
      } else {
        setArticles(items);
      }
      setTotalPages(mockPages || 1);
    },
    []
  );

  // Track category changes to reset pagination
  const categoryRef = useRef(activeCategory);

  useEffect(() => {
    setLoading(true);
    const initialFetch = async () => {
      if (categoryRef.current !== activeCategory) {
        categoryRef.current = activeCategory;
        await fetchArticles(1, activeCategory);
        setPage(1);
      } else {
        await fetchArticles(1, activeCategory);
      }
    };
    initialFetch().finally(() => setLoading(false));
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
      <Header showSearch={false} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {lang === "zh" ? "文章资讯" : lang === "ja" ? "記事" : "Articles"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "zh"
              ? "购物攻略、日本资讯、好物推荐"
              : lang === "ja"
              ? "買い物ガイド、日本情報、おすすめ"
              : "Shopping guides, Japan info, recommendations"}
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
                {cat.name[lang as keyof typeof cat.name] || cat.name.zh}
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
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-xl font-bold mb-2">
              {lang === "zh"
                ? "暂无文章"
                : lang === "ja"
                ? "記事がありません"
                : "No articles"}
            </h2>
            <p className="text-muted-foreground">
              {lang === "zh"
                ? "该分类下暂无文章"
                : lang === "ja"
                ? "このカテゴリーには記事がありません"
                : "No articles in this category"}
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
                    <div className="w-28 h-20 sm:w-36 sm:h-24 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                      <img
                        src={article.cover_image}
                        alt={article.title}
                        className="w-full h-full object-cover"
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
                ? lang === "zh"
                  ? "加载中..."
                  : lang === "ja"
                  ? "読み込み中..."
                  : "Loading..."
                : lang === "zh"
                ? "加载更多"
                : lang === "ja"
                ? "もっと見る"
                : "Load More"}
            </Button>
          </div>
        )}

        {!hasMore && articles.length > 0 && (
          <p className="text-center text-sm text-muted-foreground pt-4 pb-10">
            {lang === "zh"
              ? "— 已加载全部文章 —"
              : lang === "ja"
              ? "— 全ての記事を表示 —"
              : "— All articles loaded —"}
          </p>
        )}
      </main>
    </div>
  );
}
