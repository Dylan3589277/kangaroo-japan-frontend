"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { searchSurugaya, type SurugayaCardItem } from "@/lib/api/surugaya";
import { fetchJpyToCny, formatCnyApprox } from "@/components/home/zh/zh-daigou-data";
import { parseSurugayaId } from "./surugaya-paste";

/**
 * zh（经典/非 en）駿河屋 Surugaya 搜索 + 列表页（中国导购风）。
 * 复用 Rakuma ZhList 版式/交互，数据源换成 GET /integrations/surugaya/list。
 * 駿河屋主题：蓝色调（天蓝主色）+ 琥珀点缀（中古价）。
 * 駿河屋核心：每条卡同时展示「新品 / 中古」双价（无该状态价则不显）。
 * 金额一律 JPY 整数；≈元 = JPY × 后台 jpyToCny 汇率（前端算，复用 zh 首页口径）。zh 只显人民币。
 */

const DEFAULT_KEYWORD = "ポケモンカード";

type SortKey = "newest" | "priceAsc" | "priceDesc";

const HOT_KEYWORDS: { label: string; keyword: string }[] = [
  { label: "宝可梦卡", keyword: "ポケモンカード" },
  { label: "手办", keyword: "フィギュア" },
  { label: "游戏王", keyword: "遊戯王" },
  { label: "一番赏", keyword: "一番くじ" },
  { label: "怀旧游戏", keyword: "レトロゲーム" },
  { label: "高达模型", keyword: "ガンプラ" },
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

/** 新品/中古 双价行（駿河屋核心）。两价都缺时退回买价/价格待询。 */
function ZhDualPrice({
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
      <span className="text-sm font-bold text-sky-600">{jpy(item.priceJpy)}</span>
    ) : (
      <span className="text-xs text-zinc-400">{t("noPrice")}</span>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {hasNew && (
        <div className="flex items-baseline gap-1">
          <span className="rounded bg-sky-50 px-1 text-[10px] font-semibold text-sky-600">
            {tRoot("priceNew")}
          </span>
          <span className="text-sm font-bold text-sky-600">
            {jpy(item.priceNewJpy as number)}
          </span>
        </div>
      )}
      {hasUsed && (
        <div className="flex items-baseline gap-1">
          <span className="rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-600">
            {tRoot("priceUsed")}
          </span>
          <span className="text-sm font-bold text-amber-600">
            {jpy(item.priceUsedJpy as number)}
            {typeof item.priceUsedMaxJpy === "number" && (
              <span className="font-normal text-amber-500/70">
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

function ZhSurugayaCard({
  item,
  jpyToCny,
  t,
  tRoot,
}: {
  item: SurugayaCardItem;
  jpyToCny: number | null;
  t: ReturnType<typeof useTranslations>;
  tRoot: ReturnType<typeof useTranslations>;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const hasImage = Boolean(item.imageUrl) && !imgBroken;
  const cnyText = formatCnyApprox(item.priceJpy, jpyToCny);

  return (
    <Link
      href={`/surugaya/${encodeURIComponent(item.goodsNo)}`}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md ${
        item.soldOut ? "opacity-60" : ""
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
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
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            {t("noImage")}
          </div>
        )}

        <span className="absolute left-2 top-2 inline-flex items-center rounded-md bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          骏河屋
        </span>

        {item.soldOut && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-zinc-700/85 px-2 py-0.5 text-[10px] font-semibold text-white">
            {t("soldOut")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.4rem] text-xs leading-snug text-zinc-700">
          {item.title}
        </h3>

        <div className="mt-auto flex flex-col gap-0.5">
          <ZhDualPrice item={item} t={t} tRoot={tRoot} />
          {cnyText && (
            <span className="text-[11px] text-zinc-400">{cnyText}</span>
          )}
        </div>

        {item.sellerName && (
          <p className="truncate text-[11px] text-zinc-400">{item.sellerName}</p>
        )}
      </div>
    </Link>
  );
}

function ZhSurugayaCardSkeleton() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white">
      <div className="aspect-square w-full animate-pulse bg-zinc-100" />
      <div className="flex flex-col gap-2 p-2.5">
        <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-100" />
      </div>
    </div>
  );
}

export function ZhSurugayaList() {
  const params = useParams();
  const router = useRouter();
  const lang = (params.lang as string) || "zh";
  const t = useTranslations("surugaya.search");
  const tRoot = useTranslations("surugaya");
  const tPaste = useTranslations("surugaya.paste");

  const [jpyToCny, setJpyToCny] = useState<number | null>(null);
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
    (async () => {
      const rate = await fetchJpyToCny();
      if (active) setJpyToCny(rate);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const result = await searchSurugaya(submittedKeyword, 1);
        if (!active) return;
        setItems(result.items);
        if (result.items.length === 0) setFailed(false);
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
    <div className="min-h-screen bg-zinc-50 pb-12">
      <section className="bg-gradient-to-b from-sky-50 to-zinc-50 pb-6 pt-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold text-zinc-900">
            <span className="text-2xl">🏯</span>
            {t("heading")}
          </h1>

          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={t("placeholder")}
                className="h-12 w-full rounded-full border border-zinc-200 bg-white px-6 pr-24 text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-full bg-sky-600 px-6 text-sm font-medium text-white transition-colors hover:bg-sky-700"
              >
                {t("submit")}
              </button>
            </div>
          </form>

          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-zinc-400">{t("hot")}</span>
            {HOT_KEYWORDS.map((hot) => (
              <button
                key={hot.keyword}
                type="button"
                onClick={() => selectHotKeyword(hot.keyword)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  submittedKeyword === hot.keyword && !keyword
                    ? "border-sky-400 bg-sky-50 text-sky-600"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-sky-300 hover:text-sky-600"
                }`}
              >
                {hot.label}
              </button>
            ))}
          </div>

          {/* 双价提示 */}
          <p className="mx-auto mt-3 max-w-2xl text-center text-[11px] text-amber-600">
            {tRoot("dualPriceNote")}
          </p>

          {/* 粘贴商品链接入口 */}
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
              className="h-10 flex-1 rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="submit"
              className="h-10 shrink-0 rounded-full border border-amber-300 bg-amber-50 px-5 text-sm font-medium text-amber-600 transition-colors hover:bg-amber-100"
            >
              {t("pasteSubmit")}
            </button>
          </form>
          {pasteError && (
            <p className="mx-auto mt-1 max-w-2xl text-center text-xs text-rose-500">
              {tPaste("error")}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-block h-4 w-1 rounded-full bg-gradient-to-b from-sky-500 to-amber-400" />
            <span>
              {keyword.trim() || submittedKeyword
                ? t("current", { keyword: keyword.trim() || submittedKeyword })
                : t("recommended")}
            </span>
            {!loading && (
              <span className="text-zinc-400">
                · {t("count", { count: sortedItems.length })}
              </span>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <span className="text-zinc-400">{t("sortLabel")}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
              <ZhSurugayaCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
            <div className="mb-3 text-5xl">{failed ? "😵" : "📦"}</div>
            <p className="text-base font-medium text-zinc-700">
              {failed ? t("failedTitle") : t("emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {failed ? t("failedHint") : t("emptyHint")}
            </p>
            <button
              type="button"
              onClick={() => selectHotKeyword(DEFAULT_KEYWORD)}
              className="mt-4 rounded-full bg-sky-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
            >
              {t("seePopular")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sortedItems.map((item) => (
              <ZhSurugayaCard
                key={item.goodsNo}
                item={item}
                jpyToCny={jpyToCny}
                t={t}
                tRoot={tRoot}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
