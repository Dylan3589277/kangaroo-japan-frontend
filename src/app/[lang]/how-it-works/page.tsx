import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  buildAlternates,
  isIndexable,
  breadcrumbJsonLd,
  brandForLocale,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  SearchIcon,
  CartIcon,
  InspectIcon,
  ShipIcon,
  ReceiptIcon,
  PackageIcon,
  ShieldIcon,
} from "@/components/home/tcg/icons";

/**
 * /[lang]/how-it-works —— 代拍流程介绍页（英文优先，设计 A 深色高级感）。
 *
 * 外层 en 站壳（TcgHeader + TcgFooter）由 [lang]/layout.tsx 在 locale === "en" 时套上，
 * 本页只负责正文。文案英文优先，写入 `how-it-works` 命名空间；非 en locale 经 i18n
 * request 配置回退到英文，故任何语言访问都可读，不会崩。纯静态内容 + 入口 CTA，不碰后端。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  const t = await getTranslations({ locale: lang, namespace: "how-it-works" });

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
    alternates: buildAlternates(lang, "how-it-works"),
  };
}

const STEP_KEYS = ["search", "buy", "inspect", "ship"] as const;
const STEP_ICONS = {
  search: SearchIcon,
  buy: CartIcon,
  inspect: InspectIcon,
  ship: ShipIcon,
} as const;

const DETAIL_KEYS = ["estimates", "manual", "customs"] as const;
const DETAIL_ICONS = {
  estimates: ReceiptIcon,
  manual: PackageIcon,
  customs: ShieldIcon,
} as const;

// en 保持原深色 TCG 皮肤（逐字保留原 className）；其它 locale（zh 等）走浅色买家壳，
// 对齐 help/fee-compare 等站内既有 zh 页面（白底 + rose 主色），避免中文正文套深色
// 美式皮的"翻译页"违和感。两套 key 必须一一对应，缺哪个 locale 分支就漏样式。
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
  h2: "text-2xl font-bold text-white",
  sectionSubtitle: "mt-3 max-w-2xl text-sm leading-relaxed text-slate-400",
  card: "rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5",
  iconWrap:
    "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300",
  stepNum: "text-[11px] font-semibold uppercase tracking-wider text-cyan-400/80",
  cardTitleTop: "mt-4 font-semibold text-slate-100",
  cardBody: "mt-1.5 text-sm leading-relaxed text-slate-400",
  rowCard: "flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5",
  rowTitle: "font-semibold text-slate-100",
  rowBody: "mt-1 text-sm leading-relaxed text-slate-400",
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
  h2: "text-2xl font-bold text-zinc-900",
  sectionSubtitle: "mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600",
  card: "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm",
  iconWrap:
    "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600",
  stepNum: "text-[11px] font-semibold uppercase tracking-wider text-rose-500",
  cardTitleTop: "mt-4 font-semibold text-zinc-900",
  cardBody: "mt-1.5 text-sm leading-relaxed text-zinc-600",
  rowCard: "flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm",
  rowTitle: "font-semibold text-zinc-900",
  rowBody: "mt-1 text-sm leading-relaxed text-zinc-600",
  ctaSection: "mt-14 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-8 text-center",
  ctaTitle: "text-xl font-bold text-zinc-900",
  ctaBody: "mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-600",
};

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "how-it-works" });
  const shell = lang === "en" ? DARK : LIGHT;

  return (
    <main className={shell.main}>
      {/* GEO：面包屑结构化数据（可索引 locale 输出） */}
      {isIndexable(lang) && (
        <JsonLd
          data={breadcrumbJsonLd(lang, [
            { name: brandForLocale(lang), path: "" },
            { name: t("hero.title"), path: "how-it-works" },
          ])}
        />
      )}
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
            <Link href={`/${lang}/fees`} className={shell.secondaryBtn}>
              {t("hero.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Steps */}
        <section>
          <h2 className={shell.h2}>{t("steps.title")}</h2>
          <p className={shell.sectionSubtitle}>{t("steps.subtitle")}</p>
          <ol className="mt-7 grid gap-4 sm:grid-cols-2">
            {STEP_KEYS.map((key) => {
              const Icon = STEP_ICONS[key];
              return (
                <li key={key} className={shell.card}>
                  <div className="flex items-center gap-3">
                    <span className={shell.iconWrap}>
                      <Icon className="size-5" />
                    </span>
                    <span className={shell.stepNum}>
                      {t(`steps.items.${key}.step`)}
                    </span>
                  </div>
                  <h3 className={shell.cardTitleTop}>
                    {t(`steps.items.${key}.title`)}
                  </h3>
                  <p className={shell.cardBody}>{t(`steps.items.${key}.body`)}</p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Good to know */}
        <section className="mt-14">
          <h2 className={shell.h2}>{t("details.title")}</h2>
          <div className="mt-7 space-y-3">
            {DETAIL_KEYS.map((key) => {
              const Icon = DETAIL_ICONS[key];
              return (
                <div key={key} className={shell.rowCard}>
                  <span className={shell.iconWrap}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className={shell.rowTitle}>
                      {t(`details.items.${key}.title`)}
                    </h3>
                    <p className={shell.rowBody}>{t(`details.items.${key}.body`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className={shell.ctaSection}>
          <h2 className={shell.ctaTitle}>{t("cta.title")}</h2>
          <p className={shell.ctaBody}>{t("cta.body")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={`/${lang}/cards`} className={shell.primaryBtn}>
              {t("cta.primary")}
            </Link>
            <Link href={`/${lang}/fees`} className={shell.secondaryBtn}>
              {t("cta.secondary")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
