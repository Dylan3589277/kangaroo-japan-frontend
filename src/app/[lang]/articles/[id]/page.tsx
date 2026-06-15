"use client";
import { useTranslations } from "next-intl";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Calendar, Eye, ArrowLeft } from "lucide-react";
import Image from "next/image";
interface ArticleDetail {
  id: number;
  title: string;
  summary: string;
  content: string;
  category_id: number;
  category_name: string;
  cover_image: string;
  add_time: string;
  view_count: number;
}


function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function ArticleDetailPage() {
  const t = useTranslations('articles');
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const articleId = Number(params.id);

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const doFetch = async () => {
      setLoading(true);
      try {
        const res = await api.request("/articles/detail", {
          method: "POST",
          body: { id: articleId },
        });
        if (res.success && res.data) {
          setArticle(res.data as unknown as ArticleDetail);
          return;
        }
      } catch {
        // Production must show only backend article data.
      }

      setArticle(null);
    };

    doFetch().finally(() => setLoading(false));
  }, [articleId]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-4 -ml-2 text-muted-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="size-4 mr-1" />
          {t('back')}
        </Button>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <div className="flex gap-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        )}

        {/* Article content */}
        {!loading && article && (
          <article>
            {/* Title & meta */}
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 leading-tight">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6">
              <Badge variant="secondary">{article.category_name}</Badge>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatDate(article.add_time)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" />
                {article.view_count}
                {t('views')}
              </span>
            </div>

            {/* Cover image */}
            {article.cover_image && (
              <div className="mb-8 rounded-xl overflow-hidden bg-zinc-100 relative" style={{ aspectRatio: '16/9', maxHeight: '400px' }}>
                <Image
                  src={article.cover_image}
                  alt={article.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 768px"
                  priority
                />
              </div>
            )}

            {/* Summary */}
            {article.summary && (
              <div className="bg-zinc-100/70 rounded-lg p-4 mb-6 text-sm text-muted-foreground border-l-4 border-rose-500">
                <strong>{t('summary')}</strong>
                {article.summary}
              </div>
            )}

            {/* Rich text content */}
            <div
              className="prose prose-zinc max-w-none prose-headings:text-lg prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4 prose-p:leading-relaxed prose-p:text-base prose-p:mb-4 prose-ul:my-4 prose-li:mb-2 prose-strong:text-rose-700 prose-a:text-rose-600"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </article>
        )}

        {/* Not found */}
        {!loading && !article && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">--</div>
            <h2 className="text-xl font-bold mb-2">
              {t('notFound')}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t('notFoundDesc')}
            </p>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => router.push(`/${lang}/articles`)}
            >
              {t('backToList')}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
