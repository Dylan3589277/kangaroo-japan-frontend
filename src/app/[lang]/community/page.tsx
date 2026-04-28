"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import Image from "next/image";
import { Heart, MessageCircle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

interface CommunityItem {
  id: number;
  user_id: number;
  nickname: string;
  avatar: string;
  content: string;
  images: string[];
  like_count: number;
  comment_count: number;
  is_liked: number;
  add_time: string;
}

interface CommunityData {
  list: CommunityItem[];
  totalPages: number;
}

const MOCK_COMMUNITY: CommunityItem[] = Array.from({ length: 10 }).map((_, i) => ({
  id: i + 1,
  user_id: 100 + i,
  nickname: ["小袋鼠", "购物达人", "日本好物", "代购小能手", "东京生活", "大阪探店", "北海道风景", "京都和服", "药妆爱好者", "潮流买手"][i],
  avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${i + 1}`,
  content: [
    "今天在日本药妆店淘到了超好用的面膜！价格比国内便宜一半还多，强烈推荐给大家～",
    "帮客户代购的这款手表终于到货了，做工精致，包装也很精美，客户很满意！",
    "日本中古店淘到的LV包包，成色超新，价格只要专柜的三分之一，太香了！",
    "给大家推荐一款日本本土品牌的护肤品，敏感肌也可以用，效果真的绝了！",
    "今天去逛了东京的二手相机店，发现了好多宝藏机子，胶片机的质感真是数码无法比拟的。",
    "大阪心斋桥的药妆店补货中，帮群里的姐妹们采购了不少热门单品，满载而归！",
    "北海道的白色恋人巧克力真的太好吃啦，每次必买，送朋友也很有面子～",
    "京都的和服体验太棒了，帮客户挑选了一套精美的访问着，拍照超级出片！",
    "日本小众洗发水推荐，用完头发超级顺滑，比大牌还好用，已经回购无数次了。",
    "今天帮客户淘到了一双限量版球鞋，日本发售的款式国内根本买不到，太幸运了！",
  ][i],
  images: (() => {
    const count = (i % 3) + 1;
    return Array.from({ length: count }, (_, j) =>
      `https://picsum.photos/seed/community${i}${j}/400/300`
    );
  })(),
  like_count: Math.floor(Math.random() * 200) + 10,
  comment_count: Math.floor(Math.random() * 50) + 1,
  is_liked: i % 3 === 0 ? 1 : 0,
  add_time: new Date(Date.now() - i * 3600000 * 3).toISOString(),
}));

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export default function CommunityPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const t = useTranslations('community');

  const [list, setList] = useState<CommunityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchList = useCallback(async (pageNum: number, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      // Try API first
      const res = await api.request("/community/index", {
        method: "POST",
        body: { page: pageNum, pageSize: 10 },
      });
      if (res.success && res.data) {
        const d = res.data as any;
        const items = d.list || [];
        const pages = d.totalPages || 1;
        if (append) {
          setList((prev) => [...prev, ...items]);
        } else {
          setList(items);
        }
        setTotalPages(pages);
        return;
      }
    } catch {
      // Fallback to mock
    }

    // Mock data fallback
    const pageSize = 10;
    const mockPages = 3;
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const items = MOCK_COMMUNITY.slice(start, end);

    if (append) {
      setList((prev) => [...prev, ...items]);
    } else {
      setList(items);
    }
    setTotalPages(mockPages);
  }, []);

  useEffect(() => {
    const initialFetch = async () => {
      setLoading(true);
      try {
        // Try API first
        const res = await api.request("/community/index", {
          method: "POST",
          body: { page: 1, pageSize: 10 },
        });
        if (res.success && res.data) {
          const d = res.data as any;
          const items = d.list || [];
          const pages = d.totalPages || 1;
          setList(items);
          setTotalPages(pages);
          return;
        }
      } catch {
        // Fallback to mock
      }

      // Mock data fallback
      const pageSize = 10;
      const mockPages = 3;
      const items = MOCK_COMMUNITY.slice(0, pageSize);
      setList(items);
      setTotalPages(mockPages);
    };
    initialFetch().finally(() => setLoading(false));
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchList(nextPage, true);
  };

  const handleLike = (id: number) => {
    setList((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              is_liked: item.is_liked ? 0 : 1,
              like_count: item.is_liked ? item.like_count - 1 : item.like_count + 1,
            }
          : item
      )
    );
  };

  const hasMore = page < totalPages;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header showSearch={false} />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {t('title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('subtitle')}
            </p>
          </div>
          <Button
            className="bg-rose-600 hover:bg-rose-700 gap-2"
            onClick={() => router.push(`/${lang}/community/create`)}
          >
            <Plus className="size-4" />
            {t('create')}
          </Button>
        </div>

        {/* Loading */}
        {loading && list.length === 0 && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-3" />
                  <Skeleton className="h-40 w-full rounded-lg mb-3" />
                  <div className="flex gap-4">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && list.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-bold mb-2">
              {t('noPosts')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('noPostsDesc')}
            </p>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => router.push(`/${lang}/community/create`)}
            >
              {t('goCreate')}
            </Button>
          </div>
        )}

        {/* List */}
        <div className="space-y-4">
          {list.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                {/* User info */}
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={item.avatar} alt={item.nickname} />
                    <AvatarFallback>{item.nickname[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.nickname}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(item.add_time)}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <p className="text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                  {item.content}
                </p>

                {/* Images grid */}
                {item.images.length > 0 && (
                  <div
                    className={`grid gap-2 mb-3 ${
                      item.images.length === 1
                        ? "grid-cols-1"
                        : item.images.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3"
                    }`}
                  >
                    {item.images.map((img, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg overflow-hidden bg-zinc-100"
                      >
                        <Image
                          src={img}
                          alt={`image ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 33vw"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => handleLike(item.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${
                      item.is_liked
                        ? "text-rose-600"
                        : "text-muted-foreground hover:text-rose-600"
                    }`}
                  >
                    <Heart
                      className={`size-4 ${
                        item.is_liked ? "fill-rose-600" : ""
                      }`}
                    />
                    {item.like_count > 0 && <span>{item.like_count}</span>}
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-rose-600 transition-colors">
                    <MessageCircle className="size-4" />
                    {item.comment_count > 0 && <span>{item.comment_count}</span>}
                  </button>
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

        {!hasMore && list.length > 0 && (
          <p className="text-center text-sm text-muted-foreground pt-4 pb-10">
            {t('allLoaded')}
          </p>
        )}
      </main>
    </div>
  );
}
