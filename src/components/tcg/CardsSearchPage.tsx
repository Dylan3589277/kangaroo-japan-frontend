"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { spaceGrotesk } from "@/app/fonts";
import { SearchIcon, ArrowRightIcon } from "@/components/home/tcg/icons";
import { TcgCard, TcgCardSkeleton } from "@/components/home/tcg/TcgCard";
import { searchMercariTcg, type TcgCardItem } from "@/components/home/tcg/tcg-data";
import { POPULAR_CHIPS } from "@/components/home/tcg/tcg-keywords";
import { AlertModal } from "@/components/tcg/alerts/AlertModal";
import type { AlertFilters } from "@/components/tcg/alerts/alerts-data";

// 人话排序标签 → Mercari 旧端 sort 值（不暴露 createdAt_desc 之类技术字段）。
const SORT_OPTIONS = [
  { key: "newest", value: "SORT_CREATED_TIME|ORDER_DESC" },
  { key: "priceLow", value: "SORT_PRICE|ORDER_ASC" },
  { key: "priceHigh", value: "SORT_PRICE|ORDER_DESC" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["key"];

// 空状态/默认建议用的热门搜索：与首页芯片同一套「热门 IP 热门卡」词
//（英文标签 + 实测能出真卡的日文查询，统一来自 tcg-keywords，全部 curl 验证过）。
// 不再用泛词「ポケモン」「遊戯王」（会出钥匙扣/扭蛋等周边）。
const POPULAR_QUERIES = POPULAR_CHIPS.map((chip) => ({
  label: chip.label,
  q: chip.query,
}));

// 空关键词时的默认查询：拉首张热门卡（Pokémon 151）一屏，避免落地即空白且全是真卡。
const DEFAULT_QUERY = POPULAR_CHIPS[0].query;

/**
 * 平台筛选：本页数据层只接了 Mercari 在售（searchMercariTcg），Yahoo 没接进来。
 * 但雅虎代拍业务本身是通的（/yahoo 可浏览，详情页有在线出价与联系客服代拍两条 CTA），
 * 所以 2026-07-25 起 Yahoo 不再灰置成 "coming soon"——那是在骗买家我们不做雅虎——
 * 改成通往 /yahoo 浏览页的入口。等 Yahoo 在售接入本页数据层后再改回可筛选。
 */
const PLATFORM_OPTIONS = [
  { key: "mercari", href: null },
  { key: "yahoo", href: "/yahoo" },
] as const;

/**
 * 稀有度/卡况快捷过滤词（客户端，对已取在售结果按商品名子串命中过滤）。
 * 不改写查询、不发后端——纯本地：选中的 chip 至少要有一个命中其中一个 pattern 的名字。
 * patterns 覆盖日/英常见写法（PSA10 / PSA 10 大小写、未開封/シュリンク 等）。
 * 解析不到（当前结果里 0 命中）的 chip 置灰禁用，不让用户以为能筛全量。
 */
const RARITY_FILTERS: ReadonlyArray<{
  key: string;
  patterns: readonly string[];
}> = [
  { key: "sar", patterns: ["SAR"] },
  { key: "ssr", patterns: ["SSR"] },
  { key: "ar", patterns: ["AR"] },
  { key: "sr", patterns: ["SR"] },
  { key: "ur", patterns: ["UR"] },
  { key: "promo", patterns: ["PROMO", "プロモ"] },
  { key: "psa", patterns: ["PSA"] },
  { key: "sealed", patterns: ["未開封", "シュリンク", "BOX", "ボックス"] },
] as const;

// 名字命中某个稀有度/卡况 chip？大小写不敏感（PSA10 / psa 10 都算）。
function nameMatchesPatterns(
  name: string,
  patterns: readonly string[],
): boolean {
  const upper = name.toUpperCase();
  return patterns.some((p) => upper.includes(p.toUpperCase()));
}

/**
 * 设计 A（深色高级感）英文 TCG 卡牌搜索结果页。
 * 复用首页同一套数据层（searchMercariTcg → Mercari 在售搜索），按 ?q= 搜索。
 * en 流程的首页搜索框/芯片/CTA/TrendingCards 都指向 /cards?q=...；旧橙色 /products 不动。
 */
export function CardsSearchPage() {
  const t = useTranslations("tcg.cards");
  const tAlerts = useTranslations("tcg-alerts");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";

  // 一键建提醒 modal 开关。
  const [alertOpen, setAlertOpen] = useState(false);

  const [draft, setDraft] = useState(urlQuery);
  const [items, setItems] = useState<TcgCardItem[]>([]);
  const [loading, setLoading] = useState(Boolean(urlQuery));
  const [hasSearched, setHasSearched] = useState(Boolean(urlQuery));
  const [sort, setSort] = useState<SortKey>("newest");
  // 客户端筛选状态（不发后端）：价格区间(JPY) + 稀有度/卡况多选。
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [activeRarities, setActiveRarities] = useState<readonly string[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    document.title = `${t("metaTitle")} | JP-Buy`;
  }, [t]);

  // 解析价格输入为 JPY 整数（空/非数字视为无界）。
  const minJpy = useMemo(() => {
    const n = Number(minPrice.replaceAll(",", "").trim());
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [minPrice]);
  const maxJpy = useMemo(() => {
    const n = Number(maxPrice.replaceAll(",", "").trim());
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [maxPrice]);

  // 每个稀有度 chip 在「当前在售结果」里的命中数（用于显示计数 + 0 命中置灰）。
  // 注意：用未过滤的 items 计数，便于用户看清每个标签各有多少货。
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const def of RARITY_FILTERS) {
      counts[def.key] = items.filter((it) =>
        nameMatchesPatterns(it.title, def.patterns),
      ).length;
    }
    return counts;
  }, [items]);

  // 客户端过滤后的结果：价格区间 + 稀有度（多选取并集：命中任一选中标签即留）。
  // 价格无界端不限；稀有度未选则不过滤。纯派生，无 effect/setState。
  // 价格排序也在客户端做：旧 mericaris 列表端不接 sort（见 tcg-data 注释），
  // 故 newest=后端原始顺序（创建时间倒序），priceLow/High 在内存里稳定排序。
  const filteredItems = useMemo(() => {
    const rarityDefs = RARITY_FILTERS.filter((d) =>
      activeRarities.includes(d.key),
    );
    const next = items.filter((it) => {
      if (typeof minJpy === "number") {
        if (typeof it.priceJpy !== "number" || it.priceJpy < minJpy)
          return false;
      }
      if (typeof maxJpy === "number") {
        if (typeof it.priceJpy !== "number" || it.priceJpy > maxJpy)
          return false;
      }
      if (rarityDefs.length > 0) {
        const hit = rarityDefs.some((d) =>
          nameMatchesPatterns(it.title, d.patterns),
        );
        if (!hit) return false;
      }
      return true;
    });

    if (sort === "priceLow" || sort === "priceHigh") {
      const dir = sort === "priceLow" ? 1 : -1;
      // 无价格的排到末尾，避免插队；其余按 JPY 升/降。
      next.sort((a, b) => {
        const pa = typeof a.priceJpy === "number" ? a.priceJpy : Infinity;
        const pb = typeof b.priceJpy === "number" ? b.priceJpy : Infinity;
        if (pa === pb) return 0;
        return (pa - pb) * dir;
      });
    }

    return next;
  }, [items, minJpy, maxJpy, activeRarities, sort]);

  const hasClientFilters =
    typeof minJpy === "number" ||
    typeof maxJpy === "number" ||
    activeRarities.length > 0;

  // 一键建提醒的预填值：当前搜索词 + 已选筛选映射到后端 alert filters 形态。
  // 后端 filters 只接单个 rarity（取第一个选中的）+ maxPriceJpy；setName/condition
  // 搜索页没有，留空由用户在 modal 里补。纯派生，无 effect/setState。
  const alertKeyword = (urlQuery.trim() || draft.trim());
  const alertFilters = useMemo<AlertFilters>(() => {
    const f: AlertFilters = {};
    if (activeRarities.length > 0) f.rarity = activeRarities[0];
    if (typeof maxJpy === "number") f.maxPriceJpy = maxJpy;
    return f;
  }, [activeRarities, maxJpy]);

  const toggleRarity = (key: string) => {
    setActiveRarities((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const clearClientFilters = () => {
    setMinPrice("");
    setMaxPrice("");
    setActiveRarities([]);
  };

  const runSearch = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim();
    // 空关键词：不算「用户已搜索」，但默认拉一屏「ポケモン」避免落地空白。
    const effectiveKeyword = trimmed || DEFAULT_QUERY;
    const myId = ++requestId.current;
    setLoading(true);
    setHasSearched(Boolean(trimmed));
    const result = await searchMercariTcg({
      keyword: effectiveKeyword,
      // 结果页展示全部并把已售置灰（已售不混进首页热门，但搜索页可见）。
      // sort 不发后端（旧 mericaris 列表端不接），价格排序在客户端 filteredItems 里做。
      inStockOnly: false,
    });
    if (myId !== requestId.current) return;
    setItems(result);
    setLoading(false);
  }, []);

  // URL ?q= 变化时重新搜索（排序/筛选都在客户端，不再触发网络请求）。
  useEffect(() => {
    // 把搜索框同步到 URL ?q=（导航/前进后退时）——将本地输入对齐外部 URL 状态，
    // 是该 effect 的合法用途；runSearch 为数据获取（外部同步）。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(urlQuery);
    runSearch(urlQuery);
  }, [urlQuery, runSearch]);

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

          {/* 一键建提醒：用当前搜索词 + 已选筛选打开 modal（复用 AlertForm 预填）。 */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setAlertOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/15 hover:text-cyan-100"
            >
              <span aria-hidden>🔔</span>
              {tAlerts("searchButton")}
            </button>
          </div>
        </div>
      </section>

      {/* 一键建提醒 modal（预填当前 keyword + filters） */}
      <AlertModal
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        defaultKeyword={alertKeyword}
        defaultFilters={alertFilters}
      />

      {/* 筛选 + 排序工具条 */}
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
          {/* 热门套系/IP 快捷筛选（关键词改写：点击=用对应日文词重搜并刷新结果）。 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("filters.popularLabel")}
            </span>
            {POPULAR_QUERIES.map((chip) => {
              const active = urlQuery.trim() === chip.q;
              return (
                <button
                  key={chip.label}
                  onClick={() => goQuery(chip.q)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-cyan-400/50 bg-cyan-400/10 text-white"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* 平台 + 价格区间 + 排序 同一行（窄屏自动换行） */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {/* 平台：Mercari 真有数据；Yahoo Auctions 占位禁用。 */}
            <div className="flex items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("filters.platformLabel")}
              </span>
              {PLATFORM_OPTIONS.map((p) =>
                p.href ? (
                  <Link
                    key={p.key}
                    href={p.href}
                    title={t("filters.platform.yahooBrowseHint")}
                    className="rounded-full border border-white/[0.12] bg-white/[0.02] px-3.5 py-1.5 text-sm text-slate-300 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-white"
                  >
                    {t(`filters.platform.${p.key}`)}
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                      {t("filters.browse")}
                    </span>
                  </Link>
                ) : (
                  <button
                    key={p.key}
                    type="button"
                    className="rounded-full border border-cyan-400/50 bg-cyan-400/10 px-3.5 py-1.5 text-sm text-white transition-colors"
                  >
                    {t(`filters.platform.${p.key}`)}
                  </button>
                ),
              )}
            </div>

            {/* 价格区间（JPY，客户端过滤已取结果） */}
            <div className="flex items-center gap-2">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t("filters.priceLabel")}
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder={t("filters.priceMin")}
                aria-label={t("filters.priceMinAria")}
                className="h-9 w-24 rounded-lg border border-white/12 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
              />
              <span className="text-slate-500">–</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder={t("filters.priceMax")}
                aria-label={t("filters.priceMaxAria")}
                className="h-9 w-24 rounded-lg border border-white/12 bg-white/[0.04] px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
              />
              <span className="text-xs text-slate-600">JPY</span>
            </div>

            {/* 排序 */}
            <div className="flex items-center gap-2">
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
          </div>

          {/* 稀有度/卡况快捷过滤（客户端，按商品名命中；0 命中置灰） */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t("filters.rarityLabel")}
            </span>
            {RARITY_FILTERS.map((def) => {
              const count = rarityCounts[def.key] ?? 0;
              const active = activeRarities.includes(def.key);
              const disabled = count === 0 && !active;
              return (
                <button
                  key={def.key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() => toggleRarity(def.key)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-cyan-400/50 bg-cyan-400/10 text-white"
                      : disabled
                        ? "cursor-not-allowed border-white/[0.06] bg-white/[0.02] text-slate-600"
                        : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {t(`filters.rarity.${def.key}`)}
                  {count > 0 && (
                    <span className="ml-1.5 text-[11px] text-slate-500">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {hasClientFilters && (
              <button
                type="button"
                onClick={clearClientFilters}
                className="ml-1 rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition-colors hover:border-white/25 hover:text-white"
              >
                {t("filters.clear")}
              </button>
            )}
          </div>

          {/* 数据源限制说明：价格/稀有度是对在售结果的客户端筛选，非全量服务端筛选。 */}
          <p className="text-xs text-slate-500">{t("filters.disclaimer")}</p>
        </div>
      </section>

      {/* 结果区 */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <TcgCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-slate-400">
              {urlQuery.trim()
                ? t("resultsForCount", {
                    query: urlQuery,
                    count: filteredItems.length,
                  })
                : t("resultsCount", { count: filteredItems.length })}
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((item) => (
                <TcgCard key={item.goodsNo} item={item} />
              ))}
            </div>
          </>
        ) : items.length > 0 && hasClientFilters ? (
          // 有在售结果但被客户端筛选清空：明确是筛选导致，给「清除筛选」出口。
          <div className="mx-auto max-w-xl py-12 text-center">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-white">
              {t("filteredEmptyTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {t("filteredEmptySubtitle")}
            </p>
            <button
              type="button"
              onClick={clearClientFilters}
              className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400/20"
            >
              {t("filters.clear")}
            </button>
          </div>
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
