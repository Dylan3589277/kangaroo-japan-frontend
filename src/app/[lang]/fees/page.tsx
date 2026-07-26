import type { Metadata } from "next";
import Link from "next/link";
import { LandedCostCalculator } from "@/components/tcg/LandedCostCalculator";
import { fetchTcgPricingBasis } from "@/lib/server/exchange-rates";
import { getTranslations } from "next-intl/server";
import {
  buildAlternates,
  isIndexable,
  breadcrumbJsonLd,
  brandForLocale,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  // Fees copy is English-first; always read the `fees` namespace via the
  // resolved locale (falls back to en in the i18n request config).
  const t = await getTranslations({ locale: lang, namespace: "fees" });

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
    alternates: buildAlternates(lang, "fees"),
  };
}

const ITEM_KEYS = [
  "itemPrice",
  "domesticShipping",
  "proxyFee",
  "photoInspection",
  "consolidation",
  "internationalShipping",
  "paymentProcessing",
] as const;

// Competitor comparison. Columns are shown by initial only; "k" is us and is
// highlighted. Cell copy lives in the `comparison.rows.*` locale keys.
const COMPARISON_ROW_KEYS = [
  "proxyFee",
  "handling",
  "inspection",
  "packing",
  "payment",
] as const;

// Column order; `key` maps to the per-row locale field, `us` flags our column.
const COMPARISON_COLUMNS = [
  { key: "k", header: "K", us: true },
  { key: "b", header: "B", us: false },
  { key: "z", header: "Z", us: false },
  { key: "n", header: "N", us: false },
  { key: "f", header: "F", us: false },
  { key: "jr", header: "J.R.", us: false },
] as const;

export default async function FeesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "fees" });
  // 到手价试算只给 en（美国买家对 landed cost 敏感；zh 侧计价体系在老后台，口径不同）。
  // 取不到费率就不渲染试算器——宁可没有，也不给错数字。
  const pricingBasis = lang === "en" ? await fetchTcgPricingBasis() : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* GEO：面包屑结构化数据（可索引 locale 输出） */}
      {isIndexable(lang) && (
        <JsonLd
          data={breadcrumbJsonLd(lang, [
            { name: brandForLocale(lang), path: "" },
            { name: t("hero.title"), path: "fees" },
          ])}
        />
      )}
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        {/* electric accent glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div className="relative container mx-auto max-w-4xl px-4 py-16 sm:py-20 text-center">
          <span className="inline-block rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
            {t("hero.eyebrow")}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
            {t("hero.subtitle")}
          </p>
          <div className="mx-auto mt-6 flex max-w-2xl flex-col items-center gap-1 text-sm text-zinc-500">
            <p>{t("hero.estimateNote")}</p>
            <p>{t("hero.currencyNote")}</p>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Fee breakdown table (desktop) */}
        <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] md:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400">
                <th className="px-6 py-4 font-medium">{t("table.item")}</th>
                <th className="px-6 py-4 font-medium">{t("table.estimate")}</th>
                <th className="px-6 py-4 font-medium">{t("table.notes")}</th>
              </tr>
            </thead>
            <tbody>
              {ITEM_KEYS.map((key) => (
                <tr
                  key={key}
                  className="border-b border-white/5 last:border-0 align-top transition-colors hover:bg-white/[0.04]"
                >
                  <td className="px-6 py-5 font-medium text-zinc-100">
                    {t(`items.${key}.title`)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-cyan-300">
                    {t(`items.${key}.estimate`)}
                  </td>
                  <td className="px-6 py-5 leading-relaxed text-zinc-400">
                    {t(`items.${key}.notes`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fee breakdown cards (mobile) */}
        <div className="space-y-4 md:hidden">
          {ITEM_KEYS.map((key) => (
            <div
              key={key}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold text-zinc-100">
                  {t(`items.${key}.title`)}
                </h3>
                <span className="shrink-0 text-right text-sm font-medium text-cyan-300">
                  {t(`items.${key}.estimate`)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {t(`items.${key}.notes`)}
              </p>
            </div>
          ))}
        </div>

        {/* Competitor fee comparison —— 仅 en 渲染（2026-07-26）。
            B/Z/N/F/J.R. 五列对比的是面向海外买家的日本代购平台，对中国大陆买家
            全部不适用，在 zh 下渲染出来是一张整列「—」的空表，再配一段"本表不适用
            于你"的解释——比不显示更不专业。zh 侧有专门的 /fee-compare 页做国内
            同行对比（挖煤姬/乐一番），那才是中国买家该看的那张表。 */}
        {lang === "en" && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-zinc-100">
            {t("comparison.title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {t("comparison.subtitle")}
          </p>

          {/* Comparison table (desktop) */}
          <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400">
                  <th className="px-5 py-4 font-medium">
                    {t("comparison.providerLabel")}
                  </th>
                  {COMPARISON_COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      scope="col"
                      className={
                        col.us
                          ? "px-5 py-4 text-center font-semibold text-cyan-300"
                          : "px-5 py-4 text-center font-medium"
                      }
                    >
                      <span className="block text-base">{col.header}</span>
                      {col.us ? (
                        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wider text-cyan-400/80">
                          {t("comparison.usColumnNote")}
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROW_KEYS.map((row) => (
                  <tr
                    key={row}
                    className="border-b border-white/5 last:border-0 align-top transition-colors hover:bg-white/[0.04]"
                  >
                    <th
                      scope="row"
                      className="px-5 py-4 text-left font-medium text-zinc-100"
                    >
                      {t(`comparison.rows.${row}.label`)}
                    </th>
                    {COMPARISON_COLUMNS.map((col) => (
                      <td
                        key={col.key}
                        className={
                          col.us
                            ? "px-5 py-4 text-center leading-relaxed text-cyan-200 bg-cyan-400/[0.06]"
                            : "px-5 py-4 text-center leading-relaxed text-zinc-400"
                        }
                      >
                        {t(`comparison.rows.${row}.${col.key}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comparison cards (mobile) — one card per fee dimension */}
          <div className="mt-6 space-y-4 md:hidden">
            {COMPARISON_ROW_KEYS.map((row) => (
              <div
                key={row}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <h3 className="font-semibold text-zinc-100">
                  {t(`comparison.rows.${row}.label`)}
                </h3>
                <dl className="mt-3 space-y-2 text-sm">
                  {COMPARISON_COLUMNS.map((col) => (
                    <div
                      key={col.key}
                      className={
                        col.us
                          ? "flex items-start justify-between gap-4 rounded-lg bg-cyan-400/[0.08] px-3 py-2"
                          : "flex items-start justify-between gap-4 px-3 py-1"
                      }
                    >
                      <dt
                        className={
                          col.us
                            ? "shrink-0 font-semibold text-cyan-300"
                            : "shrink-0 font-medium text-zinc-400"
                        }
                      >
                        {col.header}
                      </dt>
                      <dd
                        className={
                          col.us
                            ? "text-right leading-relaxed text-cyan-200"
                            : "text-right leading-relaxed text-zinc-400"
                        }
                      >
                        {t(`comparison.rows.${row}.${col.key}`)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            {t("comparison.footnote")}
          </p>
          {/*
            本表按首字母匿名，而 /en/guides 的对比长文是点名的（Buyee / ZenMarket）——
            同站两套口径，买家看到 K/B/Z 也无从判断。这里给一条出口：想看具体是谁、
            怎么比的，就去那篇。匿名表本身不动，避免把点名比较搬到定价页上。
          */}
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">
            <Link
              href={`/${lang}/guides/kangaroo-japan-vs-buyee-vs-zenmarket`}
              className="text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
            >
              See the named, side-by-side comparison with Buyee and ZenMarket →
            </Link>
          </p>
        </section>
        )}

        {/* 到手价试算（仅 en，且拿到真实费率才渲染） */}
        {pricingBasis && (
          <section className="mt-10">
            <LandedCostCalculator
              jpyToUsd={pricingBasis.jpyToUsd}
              serviceFeeJpy={pricingBasis.serviceFeeJpy}
            />
          </section>
        )}

        {/* U.S. customs note (P0) */}
        <section className="mt-10 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-200">
            <span aria-hidden>⚠️</span>
            {t("customs.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
            {t("customs.body")}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-amber-100/70">
            {t("customs.note")}
          </p>
        </section>

        {/* Payment methods (trust: what cards we take, USD, Stripe-hosted checkout) */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-100">
            {t("payment.title")}
          </h2>
          <dl className="mt-4 space-y-4">
            {(["cards", "currency", "security"] as const).map((key) => (
              <div key={key}>
                <dt className="text-sm font-medium text-cyan-300">
                  {t(`payment.${key}Label`)}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {t(`payment.${key}`)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            {t("payment.note")}
          </p>
        </section>

        {/* Warehouse storage (free window exists; exact days confirmed by support) */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-100">
            {t("storage.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {t("storage.body")}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            {t("storage.note")}
          </p>
        </section>

        {/* Estimates disclaimer */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-zinc-100">
            {t("disclaimer.title")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            {t("disclaimer.body")}
          </p>
        </section>

        {/* CTA */}
        <section className="mt-10 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-8 text-center">
          <h2 className="text-xl font-semibold text-zinc-100">
            {t("cta.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            {t("cta.body")}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${lang}/products`}
              className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-cyan-300"
            >
              {t("cta.primary")}
            </Link>
            <Link
              href={`/${lang}/contact`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/5"
            >
              {t("cta.secondary")}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
