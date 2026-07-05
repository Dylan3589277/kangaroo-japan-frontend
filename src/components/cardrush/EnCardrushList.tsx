"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { spaceGrotesk } from "@/app/fonts";
import { usePlatformSearchKeyword } from "@/components/platform-search/usePlatformSearchKeyword";
import { searchCardrush, type CardrushCardItem } from "@/lib/api/cardrush";

/**
 * en（设计 A，红黑卡牌风，面向海外 tgc）CardRush カードラッシュ 搜索 + 列表页。
 * 复用 rakuma 设计 A 暗色版式，主题色由电光青改为「红黑卡牌风」(red-500 强调 + 黑底)，
 * 平台角标显「CardRush」，让买家一眼知道在看 CardRush。数据源 GET /integrations/cardrush/list。
 * 单店宝可梦卡专营，无「粘贴链接」入口（CardRush 商品 id 为纯数字）。
 * en 站显 USD（后端 price_usd，汇率不可用时只显 JPY，绝不显错币）。金额一律 JPY 整数。
 */

const DEFAULT_KEYWORD = "リザードン";

type SortKey = "newest" | "priceAsc" | "priceDesc";

const HOT_KEYWORDS: { label: string; keyword: string }[] = [
  { label: "Charizard", keyword: "リザードン" },
  { label: "Pikachu", keyword: "ピカチュウ" },
  { label: "Mew", keyword: "ミュウ" },
  { label: "VSTAR", keyword: "VSTAR" },
  { label: "SAR", keyword: "SAR" },
];

function sortItems(items: CardrushCardItem[], sort: SortKey): CardrushCardItem[] {
  if (sort === "newest") return items;
  const withPrice = [...items];
  withPrice.sort((a, b) => {
    const pa = typeof a.priceJpy === "number" ? a.priceJpy : Number.POSITIVE_INFINITY;
    const pb = typeof b.priceJpy === "number" ? b.priceJpy : Number.POSITIVE_INFINITY;
    return sort === "priceAsc" ? pa - pb : pb - pa;
  });
  return withPrice;
}

function EnCardrushCard({
  item,
  t,
}: {
  item: CardrushCardItem;
  t: ReturnType<typeof useTranslations>;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const hasImage = Boolean(item.imageUrl) && !imgBroken;

  return (
    <Link
      href={`/cardrush/${encodeURIComponent(item.goodsNo)}`}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all hover:-translate-y-0.5 hover:border-red-500/50 ${
        item.soldOut ? "opacity-50" : ""
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-white/[0.04]">
        {hasImage ? (
          <Image
            src={item.imageUrl as string}
            alt={item.title}
            fill
            unoptimized
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
            {t("noImage")}
          </div>
        )}

        <span className="absolute left-2 top-2 inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-red-400/40">
          CardRush
        </span>

        {item.soldOut && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
            {t("soldOut")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.4rem] text-xs leading-snug text-slate-300">
          {item.title}
        </h3>

        <div className="mt-auto flex items-baseline gap-1.5">
          {typeof item.priceJpy === "number" ? (
            <span className="text-sm font-bold text-red-400">
              ¥{item.priceJpy.toLocaleString("ja-JP")}
            </span>
          ) : (
            <span className="text-xs text-slate-500">{t("noPrice")}</span>
          )}
          {typeof item.priceUsd === "number" && (
            <span className="text-[11px] text-slate-500">
              ≈ ${item.priceUsd.toLocaleString("en-US")}
            </span>
          )}
        </div>

        {item.sellerName && (
          <p className="truncate text-[11px] text-slate-500">{item.sellerName}</p>
        )}
      </div>
    </Link>
  );
}

function EnCardrushCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]">
      <div className="aspect-square w-full animate-pulse bg-white/[0.05]" />
      <div className="flex flex-col gap-2 p-2.5">
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.06]" />
      </div>
    </div>
  );
}

export function EnCardrushList() {
  const params = useParams();
  const lang = (params.lang as string) || "en";
  const t = useTranslations("cardrush.search");

  const [items, setItems] = useState<CardrushCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const { keyword, setKeyword, submittedKeyword, setSubmittedKeyword } =
    usePlatformSearchKeyword(DEFAULT_KEYWORD);
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const result = await searchCardrush(submittedKeyword, 1);
        if (!active) return;
        setItems(result.items);
      } catch {
        if (!active) return;
        setItems([]);
        setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [submittedKeyword]);

  const handleSearch = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const q = keyword.trim();
      setSubmittedKeyword(q || DEFAULT_KEYWORD);
    },
    [keyword],
  );

  const selectHotKeyword = useCallback((kw: string) => {
    setKeyword("");
    setSubmittedKeyword(kw);
  }, []);

  const sortedItems = sortItems(items, sort);
  void lang;

  return (
    <main
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0e16] pb-12 text-slate-200 antialiased`}
    >
      <section className="border-b border-white/[0.06] bg-gradient-to-b from-red-950/30 to-transparent pb-6 pt-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <h1 className="mb-1 flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
            <span className="inline-flex h-6 items-center rounded-md bg-red-600 px-2 text-xs font-bold uppercase tracking-wider text-white ring-1 ring-red-400/40">
              CardRush
            </span>
            {t("heading")}
          </h1>
          <p className="mb-4 text-xs text-slate-500">
            Pokémon TCG · cardrush-pokemon.jp
          </p>

          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t("placeholder")}
                className="h-12 w-full rounded-full border border-white/15 bg-white/[0.04] px-6 pr-24 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-full bg-red-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                {t("submit")}
              </button>
            </div>
          </form>

          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-500">{t("hot")}</span>
            {HOT_KEYWORDS.map((hot) => (
              <button
                key={hot.keyword}
                type="button"
                onClick={() => selectHotKeyword(hot.keyword)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  submittedKeyword === hot.keyword && !keyword
                    ? "border-red-500/50 bg-red-500/10 text-red-300"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-red-500/30 hover:text-red-300"
                }`}
              >
                {hot.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="inline-block h-4 w-1 rounded-full bg-red-500" />
            <span>
              {keyword.trim() || submittedKeyword
                ? t("current", { keyword: keyword.trim() || submittedKeyword })
                : t("recommended")}
            </span>
            {!loading && (
              <span className="text-slate-600">
                · {t("count", { count: sortedItems.length })}
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-400">
            <span className="text-slate-600">{t("sortLabel")}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="newest">{t("sortNewest")}</option>
              <option value="priceAsc">{t("sortPriceAsc")}</option>
              <option value="priceDesc">{t("sortPriceDesc")}</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <EnCardrushCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
            <div className="mb-3 text-5xl">{failed ? "😵" : "📦"}</div>
            <p className="text-base font-medium text-slate-200">
              {failed ? t("failedTitle") : t("emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {failed ? t("failedHint") : t("emptyHint")}
            </p>
            <button
              type="button"
              onClick={() => selectHotKeyword(DEFAULT_KEYWORD)}
              className="mt-4 rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
            >
              {t("seePopular")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sortedItems.map((item) => (
              <EnCardrushCard key={item.goodsNo} item={item} t={t} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
