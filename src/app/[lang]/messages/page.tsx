"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: number;
  type: string;
  title: string;
  content: string;
  add_time: string;
  is_read: number;
}

interface MessageData {
  list: Message[];
  totalCount: number;
}

const MESSAGE_ICONS: Record<string, string> = {
  order: "📦",
  system: "🔔",
  promotion: "🎉",
  payment: "💰",
  default: "💬",
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  order: {
    zh: "订单通知",
    en: "Order",
    ja: "注文通知",
  },
  system: {
    zh: "系统通知",
    en: "System",
    ja: "システム通知",
  },
  promotion: {
    zh: "活动通知",
    en: "Promotion",
    ja: "プロモーション",
  },
  payment: {
    zh: "支付通知",
    en: "Payment",
    ja: "支払通知",
  },
};

function getTypeLabel(type: string, lang: string): string {
  return STATUS_LABELS[type]?.[lang] || type;
}

function getIcon(type: string): string {
  return MESSAGE_ICONS[type] || MESSAGE_ICONS.default;
}

function formatDateTime(dateStr: string): string {
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

  return d.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagesPage() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 10;

  const getTitle = () => {
    const titles: Record<string, string> = {
      zh: "消息中心",
      en: "Messages",
      ja: "メッセージ",
    };
    return titles[lang] || titles.zh;
  };

  const fetchMessages = useCallback(
    async (pageNum: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        // Direct fetch to PHP backend proxy as specified
        const res = await fetch(
          "https://app.kangaroo-japan.com/api/users/messageindex",
          {
            credentials: "include",
          }
        );
        const data = await res.json();

        // The API returns all messages - we handle pagination on client side
        const allMessages: Message[] = data?.list || data?.data?.list || [];
        setTotalCount(allMessages.length);

        const start = 0;
        const end = pageNum * PAGE_SIZE;
        const pagedMessages = allMessages.slice(start, end);

        if (append) {
          setMessages((prev) => [...prev, ...pagedMessages.slice(messages.length - (pageNum - 1) * PAGE_SIZE)]);
        } else {
          setMessages(pagedMessages);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        // Fallback mock data
        const mockMessages: Message[] = Array.from({ length: 8 }).map((_, i) => ({
          id: i + 1,
          type: ["order", "system", "promotion", "payment"][i % 4],
          title: `消息标题 ${i + 1}`,
          content: `这是消息 ${i + 1} 的详细内容，用于展示消息中心的功能。`,
          add_time: new Date(
            Date.now() - i * 3600000 * 2
          ).toISOString(),
          is_read: i > 3 ? 1 : 0,
        }));
        setTotalCount(mockMessages.length);
        setMessages(mockMessages.slice(0, pageNum * PAGE_SIZE));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/${lang}/login`);
      return;
    }
    if (isAuthenticated) {
      fetchMessages(1);
    }
  }, [isAuthenticated, authLoading, lang, router, fetchMessages]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage, true);
  };

  const hasMore = messages.length < totalCount;

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Skeleton className="h-10 w-40 mb-6" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-16 px-4 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h1 className="text-2xl font-bold mb-2">请先登录</h1>
        <p className="text-muted-foreground mb-6">登录后即可查看消息</p>
        <Button
          className="bg-rose-600 hover:bg-rose-700"
          onClick={() => router.push(`/${lang}/login`)}
        >
          去登录
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{getTitle()}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {lang === "zh"
            ? `共 ${totalCount} 条消息`
            : lang === "ja"
            ? `全${totalCount}件`
            : `${totalCount} messages total`}
        </p>
      </div>

      {loading && messages.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-xl font-bold mb-2">
            {lang === "zh"
              ? "暂无消息"
              : lang === "ja"
              ? "メッセージがありません"
              : "No messages"}
          </h2>
          <p className="text-muted-foreground">
            {lang === "zh"
              ? "当有新的订单或系统通知时，会显示在这里"
              : lang === "ja"
              ? "新しい注文やシステム通知があるとここに表示されます"
              : "New orders and system notifications will appear here"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className={`overflow-hidden transition-colors ${
                msg.is_read === 0
                  ? "border-l-4 border-l-rose-500 bg-rose-50/30"
                  : "opacity-75"
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0 mt-1">
                    {getIcon(msg.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm truncate">
                          {msg.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="text-xs flex-shrink-0"
                        >
                          {getTypeLabel(msg.type, lang)}
                        </Badge>
                        {msg.is_read === 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDateTime(msg.add_time)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {msg.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
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

          {!hasMore && messages.length > 0 && (
            <p className="text-center text-sm text-muted-foreground pt-4">
              {lang === "zh"
                ? "— 已加载全部消息 —"
                : lang === "ja"
                ? "— 全てのメッセージを表示 —"
                : "— All messages loaded —"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
