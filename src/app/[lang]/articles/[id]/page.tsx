"use client";
import { useTranslations } from "next-intl";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Calendar, Eye, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
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

const MOCK_DETAILS: Record<number, ArticleDetail> = {};
Array.from({ length: 12 }).forEach((_, i) => {
  const id = i + 1;
  MOCK_DETAILS[id] = {
    id,
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
      "每年都有无数新品上架，到底哪些是真正值得买的？",
      "日本中古店藏着无数宝藏，但新手往往不知道怎么逛。",
      "东京不仅是购物天堂，更是潮流文化的中心。",
      "日本除了知名大牌，还有很多低调但品质出众的小众品牌。",
      "日本海关政策经常变动，作为代购必须及时了解最新规定。",
      "京都的和服体验是日本旅游不可错过的项目。",
      "白色恋人是日本最知名的伴手礼之一。",
      "日本是球鞋爱好者的天堂。",
      "在日本购物如何退税？",
      "大阪心斋桥是大阪最繁华的购物区。",
      "日本二手奢侈品市场规模巨大。",
      "日本的零食种类繁多。",
    ][i],
    content: `
<h2>引言</h2>
<p>日本一直是购物爱好者的天堂，从药妆、电器到奢侈品、手工艺品，应有尽有。本文将为您详细介绍相关攻略，帮助您在日本购物时更加得心应手。</p>

<h2>主要内容</h2>
<p>首先，我们需要了解日本购物的基本规则和流程。日本的商店通常会在上午10点至晚上8点之间营业，百货商场的营业时间可能会稍长一些。大部分商店都支持信用卡支付，但一些小店可能只接受现金。</p>
<p>退税是日本购物的一个重要环节。外国游客在标有"Tax-Free"的商店购物，消费满5000日元（含税）即可享受免税优惠。退税时需要出示护照，退税金额一般为消费金额的8%（消费税）。需要注意的是，消耗品（如食品、化妆品）和一般商品（如衣服、电器）的退税规则略有不同。</p>

<h2>实用技巧</h2>
<ul>
  <li><strong>提前做好功课</strong>：出发前先列出购物清单，了解心仪商品的日本售价和国内售价的差异。</li>
  <li><strong>使用优惠券</strong>：很多药妆店和百货商场都提供外国游客专属优惠券，可以在网上提前下载。</li>
  <li><strong>比较价格</strong>：同一款商品在不同店铺的价格可能差异很大，建议多逛几家店再决定。</li>
  <li><strong>注意保质期</strong>：购买食品和化妆品时，注意检查生产日期和保质期。</li>
</ul>

<h2>总结</h2>
<p>日本购物不仅商品丰富，而且服务周到，是很多游客最喜欢的环节之一。希望本文的攻略能够帮助您在日本购物时更加顺利，买到心仪的好物！</p>

<p style="text-align:center;color:#999;font-size:14px;margin-top:40px;">— 文章结束，感谢阅读 —</p>
    `.trim(),
    category_id: (i % 5) + 1,
    category_name: ["购物攻略", "日本旅游", "好物推荐", "代购资讯", "日本文化"][i % 5],
    cover_image: `https://picsum.photos/seed/articledetail${i + 1}/800/400`,
    add_time: new Date(Date.now() - i * 86400000 * 3).toISOString(),
    view_count: Math.floor(Math.random() * 5000) + 500,
  };
});

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
        // Fallback to mock
      }

      // Mock data fallback
      const mockArticle = MOCK_DETAILS[articleId] || MOCK_DETAILS[1];
      setArticle(mockArticle || null);
    };

    doFetch().finally(() => setLoading(false));
  }, [articleId]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header showSearch={false} />

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
            <div className="text-6xl mb-4">🔍</div>
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
