import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  buildAlternates,
  isIndexable,
  faqPageJsonLd,
  breadcrumbJsonLd,
  brandForLocale,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { PlusIcon, MinusIcon } from "@/components/home/tcg/icons";

/**
 * /[lang]/faq —— 常见问题页（英文优先，设计 A 深色高级感）。
 *
 * 外层 en 站壳（TcgHeader + TcgFooter）由 [lang]/layout.tsx 在 locale === "en" 时套上，
 * 本页只负责正文。文案英文优先，写入 `faq` 命名空间；非 en locale 经 i18n request
 * 配置回退到英文。手风琴用原生 <details>/<summary>，保持服务端渲染、零客户端 state，
 * 避免 react-hooks 规则与水合成本。关税口径如实（2025 取消 $800 de minimis）。不碰后端。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  const t = await getTranslations({ locale: lang, namespace: "faq" });

  const base: Metadata = {
    title: t("meta.title"),
    description: t("meta.description"),
  };

  if (!isIndexable(lang)) {
    return {
      ...base,
      robots: { index: false, follow: false },
      alternates: { canonical: null, languages: {} },
    };
  }

  return {
    ...base,
    alternates: buildAlternates(lang, "faq"),
  };
}

// Group -> ordered question keys. Order is explicit (locale JSON object order is
// not guaranteed to be iterated reliably across runtimes), and IDs anchor links.
const GROUPS = [
  {
    key: "ordering",
    items: [
      "whatIsProxy",
      "marketplaces",
      "manualEntry",
      "orderStatus",
      "auctionBids",
      "searchTips",
    ],
  },
  {
    key: "fees",
    items: ["whatFees", "intlShipping", "estimates", "allInExample", "bulkSavings"],
  },
  {
    key: "shipping",
    items: ["consolidation", "protection", "shippingTime", "insurance", "lostPackage"],
  },
  {
    key: "customs",
    items: ["willIPay", "underDeclare", "tariff2026", "dutyBilling", "salesTax"],
  },
  {
    key: "tcg",
    items: ["conditionTerms", "graded", "sealed", "highValue", "whyCheaper", "authenticity"],
  },
  { key: "afterSales", items: ["soldOut", "refunds", "dispute"] },
] as const;

// en 保持原深色 TCG 皮肤（逐字保留原 className）；其它 locale 走浅色买家壳，
// 对齐 help/fee-compare 等站内既有 zh 页面。两套 key 一一对应。
const DARK = {
  main: "min-h-screen bg-[#0a0e16] text-slate-200 antialiased",
  heroSection: "relative overflow-hidden border-b border-white/[0.08]",
  heroGlow:
    "pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl",
  badge:
    "inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300",
  h1: "mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl",
  heroSubtitle: "mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400",
  primaryBtn:
    "inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300",
  secondaryBtn:
    "inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5",
  h2: "text-xl font-bold text-white",
  details:
    "group rounded-2xl border border-white/[0.08] bg-white/[0.03] [&[open]]:bg-white/[0.05]",
  summary:
    "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-slate-100 transition-colors hover:text-cyan-200 [&::-webkit-details-marker]:hidden",
  toggleIcon:
    "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-cyan-300",
  answer: "px-5 pb-5 text-sm leading-relaxed text-slate-400",
  ctaSection:
    "mt-14 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-8 text-center",
  ctaTitle: "text-xl font-bold text-white",
  ctaBody: "mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400",
};

const LIGHT: typeof DARK = {
  main: "min-h-screen bg-zinc-50 text-zinc-700 antialiased",
  heroSection:
    "relative overflow-hidden border-b border-zinc-200 bg-gradient-to-b from-rose-50 to-zinc-50",
  heroGlow:
    "pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-rose-200/40 blur-3xl",
  badge:
    "inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium uppercase tracking-wider text-rose-600",
  h1: "mt-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl",
  heroSubtitle: "mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-600",
  primaryBtn:
    "inline-flex items-center justify-center rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700",
  secondaryBtn:
    "inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100",
  h2: "text-xl font-bold text-zinc-900",
  details:
    "group rounded-2xl border border-zinc-200 bg-white shadow-sm [&[open]]:bg-rose-50/40",
  summary:
    "flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-zinc-900 transition-colors hover:text-rose-600 [&::-webkit-details-marker]:hidden",
  toggleIcon:
    "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-rose-600",
  answer: "px-5 pb-5 text-sm leading-relaxed text-zinc-600",
  ctaSection: "mt-14 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-8 text-center",
  ctaTitle: "text-xl font-bold text-zinc-900",
  ctaBody: "mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-600",
};

export default async function FaqPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "faq" });
  const shell = lang === "en" ? DARK : LIGHT;

  // GEO：FAQPage 结构化数据直接从同一套翻译取问答，保证与页面正文一字不差；
  // 只对可索引 locale 输出（ja noindex 不给）。
  const seoJsonLd = isIndexable(lang) ? (
    <>
      <JsonLd
        data={faqPageJsonLd(
          GROUPS.flatMap((group) =>
            group.items.map((item) => ({
              q: t(`groups.${group.key}.items.${item}.q`),
              a: t(`groups.${group.key}.items.${item}.a`),
            }))
          )
        )}
      />
      <JsonLd
        data={breadcrumbJsonLd(lang, [
          { name: brandForLocale(lang), path: "" },
          { name: t("hero.eyebrow"), path: "faq" },
        ])}
      />
    </>
  ) : null;

  return (
    <main className={shell.main}>
      {seoJsonLd}
      {/* Hero */}
      <section className={shell.heroSection}>
        <div aria-hidden className={shell.heroGlow} />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <span className={shell.badge}>{t("hero.eyebrow")}</span>
          <h1 className={shell.h1}>{t("hero.title")}</h1>
          <p className={shell.heroSubtitle}>{t("hero.subtitle")}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={`/${lang}/cards`} className={shell.primaryBtn}>
              {t("hero.primaryCta")}
            </Link>
            <Link href={`/${lang}/contact`} className={shell.secondaryBtn}>
              {t("hero.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        {GROUPS.map((group) => (
          <section key={group.key} className="mt-12 first:mt-0">
            <h2 className={shell.h2}>{t(`groups.${group.key}.title`)}</h2>
            <div className="mt-5 space-y-3">
              {group.items.map((item) => (
                <details key={item} className={shell.details}>
                  <summary className={shell.summary}>
                    <span>{t(`groups.${group.key}.items.${item}.q`)}</span>
                    <span aria-hidden className={shell.toggleIcon}>
                      <PlusIcon className="size-4 group-open:hidden" />
                      <MinusIcon className="hidden size-4 group-open:block" />
                    </span>
                  </summary>
                  <p className={shell.answer}>
                    {t(`groups.${group.key}.items.${item}.a`)}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className={shell.ctaSection}>
          <h2 className={shell.ctaTitle}>{t("cta.title")}</h2>
          <p className={shell.ctaBody}>{t("cta.body")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={`/${lang}/contact`} className={shell.primaryBtn}>
              {t("cta.primary")}
            </Link>
            <Link href={`/${lang}/cards`} className={shell.secondaryBtn}>
              {t("cta.secondary")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
