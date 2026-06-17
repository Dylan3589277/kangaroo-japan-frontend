import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LiveListingGrid } from "./LiveListingGrid";
import { SearchIcon, ArrowRightIcon, ShipIcon, BoxesIcon, CameraIcon } from "./icons";
import type { TcgKeyword } from "./tcg-keywords";

/**
 * 设计 A 英文 TCG 落地页（SEO 着陆）共用骨架。
 *
 * 两个落地页 /pokemon-cards、/yugioh-cards 结构同构、文案不同：
 * 文案各自走自己的 i18n namespace（pokemon-cards / yugioh-cards，英文优先，缺则回退 en）。
 * 热门卡链接英文名 → 日文查询词，点击跳现有 /cards?q=<日文词> 搜索结果页。
 * 真实在售网格复用 LiveListingGrid（searchMercariTcg → /integrations/mercari/list）。
 *
 * 法律：只用文字写 IP 名，不用官方 logo/卡图当素材；商品图来自 listing 自带图（TcgCard 处理）。
 * 费用一律 estimated；不承诺保真/无关税。
 */

const HOW_IT_WORKS_KEYS = ["search", "request", "inspect", "ship"] as const;
const PROTECTION_KEYS = ["inspection", "translation", "consolidation", "customs"] as const;

export async function TcgLandingPage({
  lang,
  namespace,
  hotCards,
  liveKeyword,
}: {
  lang: string;
  /** i18n namespace，如 "pokemon-cards" / "yugioh-cards"。 */
  namespace: string;
  /** 该 IP 热门卡（英文 label + 日文 query），点击跳 /cards?q=日文词。 */
  hotCards: readonly TcgKeyword[];
  /** 真实在售网格用的日文关键词（词库里验证过出真卡的词）。 */
  liveKeyword: string;
}) {
  const t = await getTranslations({ locale: lang, namespace });

  return (
    <div className="bg-[#0a0e16] text-slate-100">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0a0e16]" aria-hidden />
        <div
          className="absolute inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              "radial-gradient(60% 55% at 50% -8%, rgba(56,189,248,0.18), transparent 60%), radial-gradient(45% 45% at 85% 20%, rgba(45,212,191,0.12), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-16 text-center md:pt-24 md:pb-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-1.5 text-xs font-medium tracking-wide text-cyan-200">
            <span className="size-1.5 rounded-full bg-cyan-400" />
            {t("hero.eyebrow")}
          </span>

          <h1 className="mx-auto mt-6 max-w-4xl font-[family-name:var(--font-display)] text-4xl font-bold leading-[1.08] tracking-tight text-white md:text-6xl">
            {t("hero.title")}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
            {t("hero.subtitle")}
          </p>

          {/* 搜索 CTA：跳现有 /cards 搜索结果页 */}
          <div className="mx-auto mt-9 flex max-w-xl flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/cards"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 sm:w-auto"
            >
              <SearchIcon className="size-4" />
              {t("hero.ctaSearch")}
            </Link>
            <Link
              href="/fees"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-6 text-sm font-semibold text-slate-100 transition-colors hover:border-white/30 hover:bg-white/[0.07] sm:w-auto"
            >
              {t("hero.ctaFees")}
            </Link>
          </div>

          {/* 信任条 */}
          <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShipIcon className="size-4 text-cyan-300/80" />
              {t("hero.trust.shipsTo")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BoxesIcon className="size-4 text-cyan-300/80" />
              {t("hero.trust.marketplaces")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CameraIcon className="size-4 text-cyan-300/80" />
              {t("hero.trust.inspection")}
            </span>
          </div>
        </div>
      </section>

      {/* 价值主张 */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t("value.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t("value.subtitle")}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(["source", "translate", "inspect"] as const).map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                <h3 className="text-base font-semibold text-white">
                  {t(`value.points.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t(`value.points.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 热门套系/卡：英文名 → 日文查询，点击跳 /cards?q= */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t("popular.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t("popular.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {hotCards.map((card) => (
              <Link
                key={card.query}
                href={`/cards?q=${encodeURIComponent(card.query)}`}
                className="group inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white"
              >
                {card.label}
                <span className="text-xs font-normal text-slate-500 group-hover:text-cyan-200/80">
                  {card.query}
                </span>
                <ArrowRightIcon className="size-3.5 text-slate-500 transition-colors group-hover:text-cyan-300" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 真实在售网格（复用 searchMercariTcg + TcgCard） */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
                {t("live.title")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-slate-400">
                {t("live.subtitle")}
              </p>
            </div>
            <Link
              href={`/cards?q=${encodeURIComponent(liveKeyword)}`}
              className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white sm:inline-flex"
            >
              {t("live.viewAll")}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <div className="mt-8">
            <LiveListingGrid keyword={liveKeyword} count={8} />
          </div>
          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            {t("live.note")}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t("how.title")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS_KEYS.map((key, idx) => (
              <div
                key={key}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                <span className="inline-flex size-8 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-sm font-bold text-cyan-300">
                  {idx + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-white">
                  {t(`how.steps.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t(`how.steps.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buyer protection */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t("protection.title")}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            {t("protection.subtitle")}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {PROTECTION_KEYS.map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                <h3 className="text-base font-semibold text-white">
                  {t(`protection.points.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t(`protection.points.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-sm">
            <Link
              href="/fees"
              className="inline-flex items-center gap-1.5 font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
            >
              {t("protection.feesLink")}
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* OCG / 特性说明（页面特有的一段长文，走 i18n 的 detail.* ） */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-4 py-14 md:py-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
            {t("detail.title")}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">
            {t("detail.body1")}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">
            {t("detail.body2")}
          </p>
        </div>
      </section>

      {/* 关税提示（不写 duty-free） */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-amber-200">
              {t("customs.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-amber-100/80">
              {t("customs.body")}
            </p>
          </div>
        </div>
      </section>

      {/* 最终 CTA */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-8 text-center sm:p-10">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              {t("cta.body")}
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/cards"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 sm:w-auto"
              >
                <SearchIcon className="size-4" />
                {t("cta.primary")}
              </Link>
              <Link
                href="/fees"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-6 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/5 sm:w-auto"
              >
                {t("cta.secondary")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
