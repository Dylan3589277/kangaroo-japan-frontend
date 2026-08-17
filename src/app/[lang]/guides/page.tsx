import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, brandForLocale, isIndexable } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildGuideMetadata } from "./guide-shell";
import { buildZhGuideMetadata } from "./zh-guide-shell";

/**
 * /[lang]/guides —— GEO 指南 hub。
 * en 分支（原有，未改动）：英文限定，列出全部 TCG 长文指南。
 * zh 分支（2026-08-17 新增）：中文限定，列出日本代购/代拍长文指南，早返回、不影响 en 分支。
 * 新增指南时：en 在 GUIDES 数组加一行 + 同步 src/app/sitemap.ts 的 enOnlyPages；
 * zh 在 GUIDES_ZH 数组加一行 + 同步 src/app/sitemap.ts 的 zhOnlyPages。
 */

const TITLE_ZH = "日淘指南 — 日本代购代拍怎么选、怎么算、怎么避坑";
const DESCRIPTION_ZH =
  "写给中国买家的日本代购/代拍实操指南：手续费怎么算、平台怎么选、运费怎么算、新手怎么避坑、客服是不是真人，持续更新。";

// 2026-08-17：本批只做出第 1 篇真实页面，02-05 标题/简介先占位列出（slug 指向的
// 页面尚未创建，上线时逐个补 page.tsx 即可，无需再改这里的结构）。
const GUIDES_ZH = [
  {
    slug: "mercari-daigou-fee-comparison-2026",
    tag: "费用对比",
    title: "煤炉代购手续费怎么算？2026年日本代购平台手续费横评",
    description:
      "煤炉、雅虎拍卖等日本代购手续费一般怎么分档收，2026年7月主流平台实测对比，教你分辨「全免」促销价和常态价。",
  },
  {
    slug: "japan-daipai-platforms-2026",
    tag: "平台对比",
    title: "日本代拍平台哪家好？2026年横向对比与选择指南",
    description:
      "没有绝对最好的平台，只有最适合你这单的选择——手续费、仓储、合箱、拍照、专线运费、售后、客服七个维度横向对比。",
  },
  {
    slug: "japan-daigou-shipping-cost-guide",
    tag: "运费攻略",
    title: "日本代购国际运费怎么省？集运合箱与专线全解析",
    description:
      "国际运费是商品价之外最大的一笔开销，省钱核心思路就两个：合箱集运摊薄单件运费、用性价比更高的专线代替标准 EMS。",
  },
  {
    slug: "japan-daigou-newbie-guide",
    tag: "新手避坑",
    title: "日本代购新手避坑指南：这7个隐藏费用最容易被坑",
    description:
      "商品价和手续费之外，仓储超期费、合箱超额费、不可退款的增值服务、促销到期后悄悄恢复收费……第一次下单前先过一遍。",
  },
  {
    slug: "daigou-human-vs-bot-service",
    tag: "客服解读",
    title: "日本代购客服：人工与自助服务的差别，怎么避坑",
    description:
      "代购客服不只是回答问题，还要议价、留言沟通卖家、判断纠纷——自助客服效率高，非标准情况通常还是人工处理更让人放心。",
  },
] as const;

const TITLE = "Guides — Buying Japanese TCG from Japan";
const DESCRIPTION =
  "Practical guides for U.S. trading-card buyers: 2026 import taxes on Japanese cards, proxy service comparison, and how to buy from Mercari Japan.";

const GUIDES = [
  {
    slug: "japan-card-import-tax-us-2026",
    tag: "Customs & taxes",
    title: "U.S. Import Tax on Japanese Pokémon Cards in 2026",
    description:
      "The 12.5% Section 301 rate in force since July 24, 2026, carrier clearance fees, no more de minimis — with a worked example.",
  },
  {
    slug: "kangaroo-japan-vs-buyee-vs-zenmarket",
    tag: "Comparison",
    title: "Kangaroo Japan vs Buyee vs ZenMarket for Pokémon Cards",
    description:
      "Public rates, packing standards, inspection and when each proxy service is the right choice — honestly.",
  },
  {
    slug: "how-to-buy-pokemon-cards-from-mercari-japan",
    tag: "Tutorial",
    title: "How to Buy Pokémon Cards from Mercari Japan",
    description:
      "Japanese search terms that work, condition terms decoded, scam red flags, and the all-in cost.",
  },
  {
    slug: "is-buyee-legit-2026",
    tag: "Review",
    title: "Is Buyee Legit? An Honest 2026 Review for TCG Buyers",
    description:
      "Yes, it's legit — an official Mercari partner. When it fits, where its fees and packing defaults pinch card buyers, and when a TCG specialist is the better call.",
  },
  {
    slug: "japan-proxy-hidden-fees-2026",
    tag: "Fees",
    title: "Japan Proxy Shopping Hidden Fees Explained (2026)",
    description:
      "All seven charges between a Japanese listing and your door — service fees, FX markup, storage, volumetric weight, import duty — with a self-audit checklist.",
  },
  {
    slug: "psa-graded-cards-from-japan-2026",
    tag: "Graded cards",
    title: "Buying PSA Graded Cards from Japan (2026)",
    description:
      "Why slabs are often cheaper in Japan, cert-number verification, crack-proof shipping, and the full landed cost with a worked ¥30,000 example.",
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (lang === "zh") {
    return buildZhGuideMetadata({
      lang,
      path: "guides",
      title: TITLE_ZH,
      description: DESCRIPTION_ZH,
    });
  }

  return buildGuideMetadata({ lang, path: "guides", title: TITLE, description: DESCRIPTION });
}

export default async function GuidesHubPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (lang === "zh") {
    return (
      <main className="min-h-screen bg-[#0a0e16] text-slate-200 antialiased">
        {isIndexable(lang) && (
          <JsonLd
            data={breadcrumbJsonLd("zh", [
              { name: brandForLocale("zh"), path: "" },
              { name: "指南", path: "guides" },
            ])}
          />
        )}

        <section className="relative overflow-hidden border-b border-white/[0.08]">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
              指南
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              日淘这件事，讲明白
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              手续费、平台怎么选、运费怎么算、新手怎么避坑——写给中国买家，跟着日本规则变化持续更新。
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-3xl space-y-5 px-4 py-12 sm:py-16">
          {GUIDES_ZH.map((guide) => (
            <Link
              key={guide.slug}
              href={`/${lang}/guides/${guide.slug}`}
              className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.05]"
            >
              <span className="text-xs font-medium uppercase tracking-wider text-cyan-300">
                {guide.tag}
              </span>
              <h2 className="mt-2 text-xl font-bold text-white">{guide.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{guide.description}</p>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0e16] text-slate-200 antialiased">
      {isIndexable(lang) && (
        <JsonLd
          data={breadcrumbJsonLd("en", [
            { name: brandForLocale("en"), path: "" },
            { name: "Guides", path: "guides" },
          ])}
        />
      )}

      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
            Guides
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Buying Japanese cards, explained
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
            Taxes, fees, marketplaces and the traps — written for U.S. TCG buyers, kept
            current as the rules change.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-12 sm:py-16">
        {GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/${lang}/guides/${guide.slug}`}
            className="block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition-colors hover:border-cyan-400/30 hover:bg-white/[0.05]"
          >
            <span className="text-xs font-medium uppercase tracking-wider text-cyan-300">
              {guide.tag}
            </span>
            <h2 className="mt-2 text-xl font-bold text-white">{guide.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{guide.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
