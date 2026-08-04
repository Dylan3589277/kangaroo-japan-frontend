import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buildAlternates, isIndexable } from "@/lib/seo";
import {
  CameraIcon,
  InspectIcon,
  PackageIcon,
  ReceiptIcon,
  ShieldIcon,
  ShipIcon,
} from "@/components/home/tcg/icons";

/**
 * /[lang]/photo-inspection —— 拍照检查介绍页（英文优先，设计 A 深色高级感）。
 *
 * 外层 en 站壳（TcgHeader + TcgFooter）由 [lang]/layout.tsx 在 locale === "en" 时套上，
 * 本页只负责正文。文案英文优先，写入 `photo-inspection` 命名空间；非 en locale 经
 * i18n request 配置回退到英文，故任何语言访问都可读，不会崩。
 *
 * 纯静态介绍 + 入口 CTA：不碰后端 / 订单 / 支付逻辑。Mercari / Yahoo 详情页的「拍照检查」
 * 入口改为指向本页（不再弹联系客服）。价格一律标 estimated 占位，具体数留结算 / fees 页。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  // 英文优先文案；按解析后的 locale 读 `photo-inspection` 命名空间（缺则回退 en）。
  const t = await getTranslations({
    locale: lang,
    namespace: "photo-inspection",
  });

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
    alternates: buildAlternates(lang, "photo-inspection"),
  };
}

const WHY_KEYS = ["corners", "edges", "surface", "centering"] as const;
const WHY_ICONS = {
  corners: InspectIcon,
  edges: ShieldIcon,
  surface: CameraIcon,
  centering: ReceiptIcon,
} as const;

const HOW_KEYS = [
  "order",
  "warehouse",
  "photos",
  "review",
  "decide",
] as const;
const HOW_ICONS = {
  order: ReceiptIcon,
  warehouse: PackageIcon,
  photos: CameraIcon,
  review: InspectIcon,
  decide: ShipIcon,
} as const;

const EXAMPLE_KEYS = ["front", "back", "corners", "surface"] as const;

const PRICING_KEYS = ["perOrder", "perCard", "graded"] as const;

// en 保持原深色 TCG 皮肤（逐字保留原 className）；其它 locale 走浅色买家壳。
// 两套 key 一一对应。
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
  iconColor: "size-6 text-cyan-300",
  cardTitle: "mt-3 font-semibold text-slate-100",
  cardBody: "mt-1.5 text-sm leading-relaxed text-slate-400",
  footnote: "mt-4 text-xs leading-relaxed text-slate-500",
  rowCard: "flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5",
  iconWrap:
    "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300",
  rowTitle: "font-semibold text-slate-100",
  rowBody: "mt-1 text-sm leading-relaxed text-slate-400",
  exampleFrame:
    "flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center",
  exampleInner:
    "flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-white/10 bg-[#0e131d]",
  exampleIcon: "size-7 text-slate-600",
  exampleLabel: "mt-3 text-xs font-medium text-slate-300",
  pricingBox: "mt-7 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]",
  pricingDl: "divide-y divide-white/[0.06] text-sm",
  pricingLabel: "font-medium text-slate-100",
  pricingNote: "mt-0.5 text-xs leading-relaxed text-slate-500",
  pricingValue: "shrink-0 text-cyan-300 sm:text-right",
  pricingTag: "ml-1.5 text-[10px] uppercase tracking-wide text-slate-500",
  pricingLink:
    "font-medium text-cyan-300 underline-offset-2 transition-colors hover:text-cyan-200 hover:underline",
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
  iconColor: "size-6 text-rose-600",
  cardTitle: "mt-3 font-semibold text-zinc-900",
  cardBody: "mt-1.5 text-sm leading-relaxed text-zinc-600",
  footnote: "mt-4 text-xs leading-relaxed text-zinc-500",
  rowCard: "flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm",
  iconWrap:
    "inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600",
  rowTitle: "font-semibold text-zinc-900",
  rowBody: "mt-1 text-sm leading-relaxed text-zinc-600",
  exampleFrame:
    "flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center",
  exampleInner:
    "flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100",
  exampleIcon: "size-7 text-zinc-400",
  exampleLabel: "mt-3 text-xs font-medium text-zinc-600",
  pricingBox: "mt-7 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm",
  pricingDl: "divide-y divide-zinc-200 text-sm",
  pricingLabel: "font-medium text-zinc-900",
  pricingNote: "mt-0.5 text-xs leading-relaxed text-zinc-500",
  pricingValue: "shrink-0 text-rose-600 sm:text-right",
  pricingTag: "ml-1.5 text-[10px] uppercase tracking-wide text-zinc-400",
  pricingLink:
    "font-medium text-rose-600 underline-offset-2 transition-colors hover:text-rose-700 hover:underline",
  ctaSection: "mt-14 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-8 text-center",
  ctaTitle: "text-xl font-bold text-zinc-900",
  ctaBody: "mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-600",
};

export default async function PhotoInspectionPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({
    locale: lang,
    namespace: "photo-inspection",
  });
  const shell = lang === "en" ? DARK : LIGHT;

  return (
    <main className={shell.main}>
      {/* Hero */}
      <section className={shell.heroSection}>
        <div aria-hidden className={shell.heroGlow} />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <span className={shell.badge}>
            <CameraIcon className="size-3.5" />
            {t("hero.eyebrow")}
          </span>
          <h1 className={shell.h1}>{t("hero.title")}</h1>
          <p className={shell.heroSubtitle}>{t("hero.subtitle")}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={`/${lang}/cards`} className={shell.primaryBtn}>
              {t("hero.primaryCta")}
            </Link>
            <Link href={`/${lang}/orders`} className={shell.secondaryBtn}>
              {t("hero.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Why */}
        <section>
          <h2 className={shell.h2}>{t("why.title")}</h2>
          <p className={shell.sectionSubtitle}>{t("why.subtitle")}</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {WHY_KEYS.map((key) => {
              const Icon = WHY_ICONS[key];
              return (
                <div key={key} className={shell.card}>
                  <Icon className={shell.iconColor} />
                  <h3 className={shell.cardTitle}>
                    {t(`why.points.${key}.title`)}
                  </h3>
                  <p className={shell.cardBody}>{t(`why.points.${key}.body`)}</p>
                </div>
              );
            })}
          </div>
          <p className={shell.footnote}>{t("why.footnote")}</p>
        </section>

        {/* How it works */}
        <section className="mt-14">
          <h2 className={shell.h2}>{t("how.title")}</h2>
          <ol className="mt-7 space-y-3">
            {HOW_KEYS.map((key) => {
              const Icon = HOW_ICONS[key];
              return (
                <li key={key} className={shell.rowCard}>
                  <span className={shell.iconWrap}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className={shell.rowTitle}>
                      {t(`how.steps.${key}.title`)}
                    </h3>
                    <p className={shell.rowBody}>{t(`how.steps.${key}.body`)}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Example set (placeholder frames — no card artwork / IP) */}
        <section className="mt-14">
          <h2 className={shell.h2}>{t("example.title")}</h2>
          <p className={shell.sectionSubtitle}>{t("example.subtitle")}</p>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {EXAMPLE_KEYS.map((key) => (
              <div key={key} className={shell.exampleFrame}>
                <div className={shell.exampleInner} aria-hidden>
                  <CameraIcon className={shell.exampleIcon} />
                </div>
                <p className={shell.exampleLabel}>{t(`example.${key}`)}</p>
              </div>
            ))}
          </div>
          <p className={shell.footnote}>{t("example.disclaimer")}</p>
        </section>

        {/* Pricing (estimated) */}
        <section className="mt-14">
          <h2 className={shell.h2}>{t("pricing.title")}</h2>
          <p className={shell.sectionSubtitle}>{t("pricing.subtitle")}</p>
          <div className={shell.pricingBox}>
            <dl className={shell.pricingDl}>
              {PRICING_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                >
                  <div className="min-w-0 sm:flex-1">
                    <dt className={shell.pricingLabel}>
                      {t(`pricing.rows.${key}.label`)}
                    </dt>
                    <p className={shell.pricingNote}>
                      {t(`pricing.rows.${key}.note`)}
                    </p>
                  </div>
                  <dd className={shell.pricingValue}>
                    {t(`pricing.rows.${key}.value`)}
                    <span className={shell.pricingTag}>
                      {t("pricing.estimateTag")}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className={shell.footnote}>
            {t("pricing.note")}{" "}
            <Link href={`/${lang}/fees`} className={shell.pricingLink}>
              {t("pricing.feesLink")}
            </Link>
          </p>
        </section>

        {/* CTA */}
        <section className={shell.ctaSection}>
          <h2 className={shell.ctaTitle}>{t("cta.title")}</h2>
          <p className={shell.ctaBody}>{t("cta.body")}</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={`/${lang}/cards`} className={shell.primaryBtn}>
              {t("cta.browse")}
            </Link>
            <Link href={`/${lang}/orders`} className={shell.secondaryBtn}>
              {t("cta.orders")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
