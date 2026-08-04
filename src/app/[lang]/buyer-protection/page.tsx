import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buildAlternates, isIndexable } from "@/lib/seo";
import {
  ShieldIcon,
  CameraIcon,
  PackageIcon,
  BoxesIcon,
  ReceiptIcon,
  ShipIcon,
} from "@/components/home/tcg/icons";

/**
 * /[lang]/buyer-protection —— 买家保护介绍页（英文优先，设计 A 深色高级感）。
 *
 * 外层 en 站壳（TcgHeader + TcgFooter）由 [lang]/layout.tsx 在 locale === "en" 时套上，
 * 本页只负责正文。文案英文优先，写入 `buyer-protection` 命名空间；非 en locale 经 i18n
 * request 配置回退到英文。口径：不承诺保真/最低价/无关税，高价卡明确提示风险。纯静态，不碰后端。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  const t = await getTranslations({
    locale: lang,
    namespace: "buyer-protection",
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
    alternates: buildAlternates(lang, "buyer-protection"),
  };
}

const SAFEGUARD_KEYS = [
  "sellerRisk",
  "photoInspection",
  "packaging",
  "consolidation",
  "transparentFees",
  "tracking",
] as const;
const SAFEGUARD_ICONS = {
  sellerRisk: ShieldIcon,
  photoInspection: CameraIcon,
  packaging: PackageIcon,
  consolidation: BoxesIcon,
  transparentFees: ReceiptIcon,
  tracking: ShipIcon,
} as const;

const HONEST_KEYS = ["authenticity", "sealed", "noTax"] as const;

const REFUND_KEYS = ["failedPurchase", "inspection", "disputes"] as const;

// en 保持原深色 TCG 皮肤（逐字保留原 className）；其它 locale 走浅色买家壳。
// cyan「确认」卡→rose，amber「诚实免责」卡沿用 amber（非 cyan，且和站内 help 页
// 免责提示的 amber-50 配色一致）。两套 key 一一对应。
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
  confirmCard: "rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-5",
  confirmTitle: "flex items-center gap-2 font-semibold text-cyan-200",
  confirmBody: "mt-1.5 text-sm leading-relaxed text-slate-300/80",
  warnCard: "rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5",
  warnTitle: "flex items-center gap-2 font-semibold text-amber-200",
  warnBody: "mt-1.5 text-sm leading-relaxed text-amber-100/80",
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
  confirmCard: "rounded-2xl border border-rose-200 bg-rose-50 p-5",
  confirmTitle: "flex items-center gap-2 font-semibold text-rose-700",
  confirmBody: "mt-1.5 text-sm leading-relaxed text-zinc-600",
  warnCard: "rounded-2xl border border-amber-200 bg-amber-50 p-5",
  warnTitle: "flex items-center gap-2 font-semibold text-amber-800",
  warnBody: "mt-1.5 text-sm leading-relaxed text-amber-700",
  ctaSection: "mt-14 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-8 text-center",
  ctaTitle: "text-xl font-bold text-zinc-900",
  ctaBody: "mx-auto mt-2 max-w-xl text-sm leading-relaxed text-zinc-600",
};

export default async function BuyerProtectionPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const t = await getTranslations({
    locale: lang,
    namespace: "buyer-protection",
  });
  const shell = lang === "en" ? DARK : LIGHT;

  return (
    <main className={shell.main}>
      {/* Hero */}
      <section className={shell.heroSection}>
        <div aria-hidden className={shell.heroGlow} />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:py-20">
          <span className={shell.badge}>
            <ShieldIcon className="size-3.5" />
            {t("hero.eyebrow")}
          </span>
          <h1 className={shell.h1}>{t("hero.title")}</h1>
          <p className={shell.heroSubtitle}>{t("hero.subtitle")}</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={`/${lang}/cards`} className={shell.primaryBtn}>
              {t("hero.primaryCta")}
            </Link>
            <Link href={`/${lang}/how-it-works`} className={shell.secondaryBtn}>
              {t("hero.secondaryCta")}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Safeguards */}
        <section>
          <h2 className={shell.h2}>{t("safeguards.title")}</h2>
          <p className={shell.sectionSubtitle}>{t("safeguards.subtitle")}</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {SAFEGUARD_KEYS.map((key) => {
              const Icon = SAFEGUARD_ICONS[key];
              return (
                <div key={key} className={shell.card}>
                  <Icon className={shell.iconColor} />
                  <h3 className={shell.cardTitle}>
                    {t(`safeguards.items.${key}.title`)}
                  </h3>
                  <p className={shell.cardBody}>
                    {t(`safeguards.items.${key}.body`)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Refund policy in writing (trust: failed purchase = full refund, human inspection, dispute path) */}
        <section className="mt-14">
          <h2 className={shell.h2}>{t("refunds.title")}</h2>
          <p className={shell.sectionSubtitle}>{t("refunds.subtitle")}</p>
          <div className="mt-7 space-y-3">
            {REFUND_KEYS.map((key) => (
              <div key={key} className={shell.confirmCard}>
                <h3 className={shell.confirmTitle}>
                  <span aria-hidden>✓</span>
                  {t(`refunds.items.${key}.title`)}
                </h3>
                <p className={shell.confirmBody}>
                  {t(`refunds.items.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What we won't promise (honest disclaimer) */}
        <section className="mt-14">
          <h2 className={shell.h2}>{t("honest.title")}</h2>
          <p className={shell.sectionSubtitle}>{t("honest.subtitle")}</p>
          <div className="mt-7 space-y-3">
            {HONEST_KEYS.map((key) => (
              <div key={key} className={shell.warnCard}>
                <h3 className={shell.warnTitle}>
                  <span aria-hidden>⚠️</span>
                  {t(`honest.items.${key}.title`)}
                </h3>
                <p className={shell.warnBody}>{t(`honest.items.${key}.body`)}</p>
              </div>
            ))}
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
            <Link href={`/${lang}/faq`} className={shell.secondaryBtn}>
              {t("cta.secondary")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
