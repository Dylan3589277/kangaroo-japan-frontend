"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { spaceGrotesk } from "@/app/fonts";
import { searchSurugaya, type SurugayaCardItem } from "@/lib/api/surugaya";
import { parseSurugayaId } from "./surugaya-paste";

/**
 * en（设计 A，深色，面向海外）駿河屋 Surugaya 搜索 + 列表页。
 * 复用 Mercari/Rakuma 设计 A 暗色版式，数据源 GET /integrations/surugaya/list。
 * 駿河屋主题：海军蓝底 + 天蓝 sky-400 主色 + 琥珀 amber-400 点缀（双价中古色）。
 * 駿河屋核心：每条卡同时展示「新品 / 中古」双价（无该状态价则不显）。
 * en 站显 USD（后端 price_usd，汇率不可用时只显 JPY，绝不显错币）。金额一律 JPY 整数。
 */

const DEFAULT_KEYWORD = "ポケモンカード";

type SortKey = "newest" | "priceAsc" | "priceDesc";

const HOT_KEYWORDS: { label: string; keyword: string }[] = [
  { label: "Pokémon", keyword: "ポケモンカード" },
  { label: "Figures", keyword: "フィギュア" },
  { label: "Yu-Gi-Oh!", keyword: "遊戯王" },
  { label: "One Piece", keyword: "ワンピースカード" },
  { label: "Retro Games", keyword: "レトロゲーム" },
];

function sortItems(items: SurugayaCardItem[], sort: SortKey): SurugayaCardItem[] {
  if (sort === "newest") return items;
  const withPrice = [...items];
  withPrice.sort((a, b) => {
    const pa = typeof a.priceJpy === "number" ? a.priceJpy : Number.POSITIVE_INFINITY;
    const pb = typeof b.priceJpy === "number" ? b.priceJpy : Number.POSITIVE_INFINITY;
    return sort === "priceAsc" ? pa - pb : pb - pa;
  });
  return withPrice;
}

function jpy(n: number): string {
  return `¥${n.toLocaleString("ja-JP")}`;
}

/** 新品/中古 双价行（駿河屋核心）。两价都缺时退回买价/价格待询。
 *  t = surugaya.search（noPrice），tRoot = surugaya（priceNew/priceUsed 标签）。 */
function EnDualPrice({
  item,
  t,
  tRoot,
}: {
  item: SurugayaCardItem;
  t: ReturnType<typeof useTranslations>;
  tRoot: ReturnType<typeof useTranslations>;
}) {
  const hasNew = typeof item.priceNewJpy === "number";
  const hasUsed = typeof item.priceUsedJpy === "number";

  if (!hasNew && !hasUsed) {
    return typeof item.priceJpy === "number" ? (
      <span className="text-sm font-bold text-sky-300">{jpy(item.priceJpy)}</span>
    ) : (
      <span className="text-xs text-slate-500">{t("noPrice")}</span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {hasNew && (
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-400">
            {tRoot("priceNew")}
          </span>
          <span className="text-sm font-bold text-sky-300">
            {jpy(item.priceNewJpy as number)}
          </span>
        </div>
      )}
      {hasUsed && (
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
            {tRoot("priceUsed")}
          </span>
          <span className="text-sm font-bold text-amber-300">
            {jpy(item.priceUsedJpy as number)}
            {typeof item.priceUsedMaxJpy === "number" && (
              <span className="font-normal text-amber-400/70">
                {" ~ "}
                {jpy(item.priceUsedMaxJpy)}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function EnSurugayaCard({
  item,
  t,
  tRoot,
}: {
  item: SurugayaCardItem;
  t: ReturnType<typeof useTranslations>;
  tRoot: ReturnType<typeof useTranslations>;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const hasImage = Boolean(item.imageUrl) && !imgBroken;

  return (
    <Link
      href={`/surugaya/${encodeURIComponent(item.goodsNo)}`}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] transition-all hover:-translate-y-0.5 hover:border-sky-400/40 ${
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

        <span className="absolute left-2 top-2 inline-flex items-center rounded-md bg-sky-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          駿河屋
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

        <div className="mt-auto flex flex-col gap-0.5">
          <EnDualPrice item={item} t={t} tRoot={tRoot} />
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

function EnSurugayaCardSkeleton() {
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

export function EnSurugayaList() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "en";
  const t = useTranslations("surugaya.search");
  const tRoot = useTranslations("surugaya");
  const tPaste = useTranslations("surugaya.paste");

  const [items, setItems] = useState<SurugayaCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [submittedKeyword, setSubmittedKeyword] = useState(DEFAULT_KEYWORD);
  const [sort, setSort] = useState<SortKey>("newest");

  const [pasteValue, setPasteValue] = useState("");
  const [pasteError, setPasteError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const result = await searchSurugaya(submittedKeyword, 1);
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

  const handlePaste = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const id = parseSurugayaId(pasteValue);
      if (!id) {
        setPasteError(true);
        return;
      }
      setPasteError(false);
      router.push(`/${lang}/surugaya/${encodeURIComponent(id)}`);
    },
    [pasteValue, router, lang],
  );

  const selectHotKeyword = useCallback((kw: string) => {
    setKeyword("");
    setSubmittedKeyword(kw);
  }, []);

  const sortedItems = sortItems(items, sort);

  return (
    <main
      className={`${spaceGrotesk.variable} min-h-screen bg-[#0a0f1a] pb-12 text-slate-200 antialiased`}
    >
      <section className="border-b border-white/[0.06] bg-white/[0.02] pb-6 pt-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <h1 className="mb-4 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white">
            {t("heading")}
          </h1>

          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t("placeholder")}
                className="h-12 w-full rounded-full border border-white/15 bg-white/[0.04] px-6 pr-24 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-full bg-sky-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
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
                    ? "border-sky-400/50 bg-sky-400/10 text-sky-300"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-sky-400/30 hover:text-sky-300"
                }`}
              >
                {hot.label}
              </button>
            ))}
          </div>

          {/* dual-price hint */}
          <p className="mx-auto mt-3 max-w-2xl text-center text-[11px] text-amber-300/80">
            {tRoot("dualPriceNote")}
          </p>

          {/* Paste-link entry */}
          <form
            onSubmit={handlePaste}
            className="mx-auto mt-4 flex max-w-2xl items-center gap-2"
          >
            <input
              type="text"
              value={pasteValue}
              onChange={(e) => {
                setPasteValue(e.target.value);
                if (pasteError) setPasteError(false);
              }}
              placeholder={tPaste("placeholder")}
              aria-invalid={pasteError}
              className="h-10 flex-1 rounded-full border border-white/12 bg-white/[0.03] px-5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
            />
            <button
              type="submit"
              className="h-10 shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-400/20"
            >
              {t("pasteSubmit")}
            </button>
          </form>
          {pasteError && (
            <p className="mx-auto mt-1 max-w-2xl text-center text-xs text-rose-400">
              {tPaste("error")}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="inline-block h-4 w-1 rounded-full bg-sky-400" />
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
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400"
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
              <EnSurugayaCardSkeleton key={i} />
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
              className="mt-4 rounded-full bg-sky-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-400"
            >
              {t("seePopular")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sortedItems.map((item) => (
              <EnSurugayaCard key={item.goodsNo} item={item} t={t} tRoot={tRoot} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
