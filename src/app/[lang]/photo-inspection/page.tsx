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

  return (
    <main className="min-h-screen bg-[#0a0e16] text-slate-200 antialiased">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
            <CameraIcon className="size-3.5" />
            {t("hero.eyebrow")}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
            {t("hero.subtitle")}
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${lang}/cards`}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
            >
              {t("hero.primaryCta")}
            </Link>
            <Link
              href={`/${lang}/orders`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
            >
              {t("hero.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Why */}
        <section>
          <h2 className="text-2xl font-bold text-white">{t("why.title")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t("why.subtitle")}
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {WHY_KEYS.map((key) => {
              const Icon = WHY_ICONS[key];
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
                >
                  <Icon className="size-6 text-cyan-300" />
                  <h3 className="mt-3 font-semibold text-slate-100">
                    {t(`why.points.${key}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                    {t(`why.points.${key}.body`)}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            {t("why.footnote")}
          </p>
        </section>

        {/* How it works */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold text-white">{t("how.title")}</h2>
          <ol className="mt-7 space-y-3">
            {HOW_KEYS.map((key) => {
              const Icon = HOW_ICONS[key];
              return (
                <li
                  key={key}
                  className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-100">
                      {t(`how.steps.${key}.title`)}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">
                      {t(`how.steps.${key}.body`)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Example set (placeholder frames — no card artwork / IP) */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold text-white">{t("example.title")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t("example.subtitle")}
          </p>
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {EXAMPLE_KEYS.map((key) => (
              <div
                key={key}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center"
              >
                <div
                  className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-white/10 bg-[#0e131d]"
                  aria-hidden
                >
                  <CameraIcon className="size-7 text-slate-600" />
                </div>
                <p className="mt-3 text-xs font-medium text-slate-300">
                  {t(`example.${key}`)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            {t("example.disclaimer")}
          </p>
        </section>

        {/* Pricing (estimated) */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold text-white">{t("pricing.title")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t("pricing.subtitle")}
          </p>
          <div className="mt-7 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
            <dl className="divide-y divide-white/[0.06] text-sm">
              {PRICING_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                >
                  <div className="min-w-0 sm:flex-1">
                    <dt className="font-medium text-slate-100">
                      {t(`pricing.rows.${key}.label`)}
                    </dt>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                      {t(`pricing.rows.${key}.note`)}
                    </p>
                  </div>
                  <dd className="shrink-0 text-cyan-300 sm:text-right">
                    {t(`pricing.rows.${key}.value`)}
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                      {t("pricing.estimateTag")}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            {t("pricing.note")}{" "}
            <Link
              href={`/${lang}/fees`}
              className="font-medium text-cyan-300 underline-offset-2 transition-colors hover:text-cyan-200 hover:underline"
            >
              {t("pricing.feesLink")}
            </Link>
          </p>
        </section>

        {/* CTA */}
        <section className="mt-14 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-8 text-center">
          <h2 className="text-xl font-bold text-white">{t("cta.title")}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            {t("cta.body")}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${lang}/cards`}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300"
            >
              {t("cta.browse")}
            </Link>
            <Link
              href={`/${lang}/orders`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
            >
              {t("cta.orders")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
