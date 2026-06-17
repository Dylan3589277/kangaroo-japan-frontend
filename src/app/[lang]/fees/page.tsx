import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buildAlternates, isIndexable } from "@/lib/seo";

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

export default async function FeesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "fees" });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
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
