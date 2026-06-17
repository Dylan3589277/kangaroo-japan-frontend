import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buildAlternates, isIndexable } from "@/lib/seo";
import {
  ShipIcon,
  ReceiptIcon,
  ShieldIcon,
  InspectIcon,
} from "@/components/home/tcg/icons";

/**
 * /[lang]/about —— 品牌介绍页（英文优先，设计 A 深色高级感）。
 *
 * 外层 en 站壳（TcgHeader + TcgFooter）由 [lang]/layout.tsx 在 locale === "en" 时套上，
 * 本页只负责正文。文案英文优先，写入 `about` 命名空间；非 en locale 经 i18n request
 * 配置回退到英文。简短品牌故事 + 价值主张，不碰后端。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  const t = await getTranslations({ locale: lang, namespace: "about" });

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
    alternates: buildAlternates(lang, "about"),
  };
}

const VALUE_KEYS = ["sourcing", "transparency", "protection", "focus"] as const;
const VALUE_ICONS = {
  sourcing: ShipIcon,
  transparency: ReceiptIcon,
  protection: ShieldIcon,
  focus: InspectIcon,
} as const;

export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({ locale: lang, namespace: "about" });

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
              href={`/${lang}/how-it-works`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
            >
              {t("hero.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Story */}
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-white">{t("story.title")}</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            {t("story.body1")}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            {t("story.body2")}
          </p>
        </section>

        {/* Values */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold text-white">{t("values.title")}</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {VALUE_KEYS.map((key) => {
              const Icon = VALUE_ICONS[key];
              return (
                <div
                  key={key}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
                >
                  <Icon className="size-6 text-cyan-300" />
                  <h3 className="mt-3 font-semibold text-slate-100">
                    {t(`values.items.${key}.title`)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                    {t(`values.items.${key}.body`)}
                  </p>
                </div>
              );
            })}
          </div>
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
              {t("cta.primary")}
            </Link>
            <Link
              href={`/${lang}/fees`}
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5"
            >
              {t("cta.secondary")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
