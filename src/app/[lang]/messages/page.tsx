"use client";

import { loginPathWithNext } from "@/lib/login-redirect";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CreditCard,
  Megaphone,
  MessageCircle,
  Package,
  type LucideIcon,
} from "lucide-react";
import { MascotScene } from "@/components/common/MascotScene";

interface Message {
  id: number;
  type: string;
  title: string;
  content: string;
  add_time: string;
  is_read: number;
}

const MESSAGE_ICONS: Record<string, LucideIcon> = {
  order: Package,
  system: Bell,
  promotion: Megaphone,
  payment: CreditCard,
  default: MessageCircle,
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  order: "orderUpdate",
  system: "systemNotice",
  promotion: "promotion",
  payment: "paymentNotice",
};

type MessageTranslator = ReturnType<typeof useTranslations>;

function getTypeLabel(type: string, t: MessageTranslator): string {
  const key = STATUS_LABEL_KEYS[type];
  return key ? t(key) : type;
}

function getIcon(type: string): LucideIcon {
  return MESSAGE_ICONS[type] || MESSAGE_ICONS.default;
}

function formatDateTime(dateStr: string, t: MessageTranslator): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("justNow");
  if (diffMin < 60) return t("minutesAgo", { minutes: diffMin });
  if (diffHour < 24) return t("hoursAgo", { hours: diffHour });
  if (diffDay < 7) return t("daysAgo", { days: diffDay });

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
  const t = useTranslations('messages');
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 10;

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
          setMessages((prev) => [...prev, ...pagedMessages.slice(prev.length)]);
        } else {
          setMessages(pagedMessages);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        setTotalCount(0);
        if (!append) {
          setMessages([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(loginPathWithNext(lang));
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
        <div className="text-6xl mb-4">!</div>
        <h1 className="text-2xl font-bold mb-2">{t('needLogin')}</h1>
        <p className="text-muted-foreground mb-6">{t('needLoginDesc')}</p>
        <Button
          className="bg-rose-600 hover:bg-rose-700"
          onClick={() => router.push(loginPathWithNext(lang))}
        >
          {t('goLogin')}
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('total', { count: totalCount })}
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
          {lang === "zh" ? (
            <MascotScene name="message" alt={t('noMessages')} className="mb-4" />
          ) : (
            <div className="text-6xl mb-4">--</div>
          )}
          <h2 className="text-xl font-bold mb-2">{t('noMessages')}</h2>
          <p className="text-muted-foreground">{t('noMessagesDesc')}</p>
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
                  <div className="flex-shrink-0 mt-1">
                    {(() => {
                      const Icon = getIcon(msg.type);
                      return <Icon className="size-5 text-muted-foreground" aria-hidden="true" />;
                    })()}
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
                          {getTypeLabel(msg.type, t)}
                        </Badge>
                        {msg.is_read === 0 && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDateTime(msg.add_time, t)}
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
                  ? t('loading')
                  : t('loadMore')}
              </Button>
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <p className="text-center text-sm text-muted-foreground pt-4">
              {t('allLoaded')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
