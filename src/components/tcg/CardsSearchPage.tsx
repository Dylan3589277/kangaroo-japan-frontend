"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";
import { SearchIcon, ArrowRightIcon } from "@/components/home/tcg/icons";
import { TcgCard, TcgCardSkeleton } from "@/components/home/tcg/TcgCard";
import { searchMercariTcg, type TcgCardItem } from "@/components/home/tcg/tcg-data";

// 人话排序标签 → Mercari 旧端 sort 值（不暴露 createdAt_desc 之类技术字段）。
const SORT_OPTIONS = [
  { key: "newest", value: "SORT_CREATED_TIME|ORDER_DESC" },
  { key: "priceLow", value: "SORT_PRICE|ORDER_ASC" },
  { key: "priceHigh", value: "SORT_PRICE|ORDER_DESC" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

// 空状态/默认建议用的热门搜索（与首页芯片一致的英文标签 + 真实日文查询）。
// 注意：避开「ポケモンカード」（旧 mericaris 列表端对该词会抓空），首选「ポケモン」。
const POPULAR_QUERIES = [
  { label: "Pokémon", q: "ポケモン" },
  { label: "Eevee Heroes", q: "イーブイヒーローズ" },
  { label: "Charizard", q: "リザードン" },
  { label: "Yu-Gi-Oh OCG", q: "遊戯王" },
  { label: "Blue-Eyes White Dragon", q: "青眼の白龍" },
] as const;

// 空关键词时的默认查询：拉「ポケモン」一屏，避免落地即空白。
const DEFAULT_QUERY = "ポケモン";

/**
 * 设计 A（深色高级感）英文 TCG 卡牌搜索结果页。
 * 复用首页同一套数据层（searchMercariTcg → Mercari 在售搜索），按 ?q= 搜索。
 * en 流程的首页搜索框/芯片/CTA/TrendingCards 都指向 /cards?q=...；旧橙色 /products 不动。
 */
export function CardsSearchPage() {
  const t = useTranslations("tcg.cards");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  const [draft, setDraft] = useState(urlQuery);
  const [items, setItems] = useState<TcgCardItem[]>([]);
  const [loading, setLoading] = useState(Boolean(urlQuery));
  const [hasSearched, setHasSearched] = useState(Boolean(urlQuery));
  const [sort, setSort] = useState<SortKey>("newest");
  const requestId = useRef(0);

  useEffect(() => {
    document.title = `${t("metaTitle")} | JP-Buy`;
  }, [t]);

  const runSearch = useCallback(
    async (keyword: string, sortKey: SortKey) => {
      const trimmed = keyword.trim();
      // 空关键词：不算「用户已搜索」，但默认拉一屏「ポケモン」避免落地空白。
      const effectiveKeyword = trimmed || DEFAULT_QUERY;
      const myId = ++requestId.current;
      setLoading(true);
      setHasSearched(Boolean(trimmed));
      const sortValue =
        SORT_OPTIONS.find((option) => option.key === sortKey)?.value ??
        SORT_OPTIONS[0].value;
      const result = await searchMercariTcg({
        keyword: effectiveKeyword,
        sort: sortValue,
        // 结果页展示全部并把已售置灰（已售不混进首页热门，但搜索页可见）。
        inStockOnly: false,
      });
      if (myId !== requestId.current) return;
      setItems(result);
      setLoading(false);
    },
    [],
  );

  // URL ?q= 或排序变化时重新搜索。
  useEffect(() => {
    // 把搜索框同步到 URL ?q=（导航/前进后退时）——将本地输入对齐外部 URL 状态，
    // 是该 effect 的合法用途；runSearch 为数据获取（外部同步）。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(urlQuery);
    runSearch(urlQuery, sort);
  }, [urlQuery, sort, runSearch]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = draft.trim();
    // 改 URL（?q=），由上面的 effect 触发搜索；en 前缀 next-intl 自动补。
    router.push(q ? `/cards?q=${encodeURIComponent(q)}` : "/cards");
  };

  const goQuery = (q: string) => {
    router.push(`/cards?q=${encodeURIComponent(q)}`);
  };

  return (
    <main
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] text-slate-200 antialiased`}
    >
      {/* 顶部：标题 + 深色搜索框 */}
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        <div
          className="absolute inset-0 opacity-60"
          aria-hidden
          style={{
            background:
              "radial-gradient(55% 60% at 50% -10%, rgba(56,189,248,0.16), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-12 md:pt-16">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
            {t("subtitle")}
          </p>

          <form onSubmit={submit} className="mt-6 max-w-2xl">
            <div className="group relative flex items-center rounded-2xl border border-white/12 bg-white/[0.04] p-1.5 shadow-2xl shadow-black/40 backdrop-blur transition-colors focus-within:border-cyan-400/50">
              <SearchIcon className="ml-3 size-5 shrink-0 text-slate-400" />
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchAria")}
                className="h-11 w-full bg-transparent px-3 text-sm text-white placeholder:text-slate-500 outline-none md:text-base"
              />
              <button
                type="submit"
                className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-[#06121b] transition-colors hover:bg-cyan-300 md:px-5"
              >
                {t("searchCta")}
                <ArrowRightIcon className="size-4" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* 工具条：排序（人话标签） */}
      {hasSearched && (
        <section className="border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-4">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("sortLabel")}
            </span>
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => setSort(option.key)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  sort === option.key
                    ? "border-cyan-400/50 bg-cyan-400/10 text-white"
                    : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:text-white"
                }`}
              >
                {t(`sort.${option.key}`)}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 结果区 */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <TcgCardSkeleton key={i} />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            {urlQuery.trim() && (
              <p className="mb-6 text-sm text-slate-400">
                {t("resultsFor", { query: urlQuery })}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <TcgCard key={item.goodsNo} item={item} />
              ))}
            </div>
          </>
        ) : (
          // 空状态：给「热门搜索」入口（不露技术字段）。
          <div className="mx-auto max-w-xl py-12 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
              {hasSearched ? t("emptyTitle") : t("startTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {hasSearched ? t("emptySubtitle") : t("startSubtitle")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {POPULAR_QUERIES.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => goQuery(chip.q)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-sm text-slate-200 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white"
                >
                  <SearchIcon className="size-3.5 text-slate-400" />
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
