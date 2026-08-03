"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { usePlatformSearchKeyword } from "@/components/platform-search/usePlatformSearchKeyword";
import { searchMercariTcg, type TcgCardItem } from "@/components/home/tcg/tcg-data";
import { fetchJpyToCny, formatCnyApprox } from "@/components/home/zh/zh-daigou-data";
import { ImagePlaceholder } from "@/components/ui/image-placeholder";
import { MascotScene } from "@/components/common/MascotScene";

/**
 * zh（经典/非 en）Mercari 煤炉列表页（中国导购风，暖色调）。
 * 仅在 locale !== "en" 时由 [lang]/mercari/page.tsx 渲染；en 设计 A 列表原样不动。
 * 文案直接写中文（无 i18n namespace，避免 key 缺失）。zh 站只显人民币（≈元），绝不显美元。
 *
 * 数据源：复用 tcg-data.searchMercariTcg → GET /integrations/mercari/list?keyword=&page=
 * （后端再代理旧系统 mericaris，无需登录）。默认词进页面即拉一批在售，搜索/选词后刷新。
 * 金额一律 JPY 整数。≈元 = JPY × 后台 jpyToCny 汇率（前端算，复用 zh 首页口径）。
 */

/** 默认进页面拉一批在售的热门词（按日文检索，命中率高、能出货）。 */
const DEFAULT_KEYWORD = "ポケモンカード";

/** 排序：旧 mericaris 列表端不接 sort，故前端本地排序，标签全中文化。 */
type SortKey = "newest" | "priceAsc" | "priceDesc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "最新上架" },
  { key: "priceAsc", label: "价格升序" },
  { key: "priceDesc", label: "价格降序" },
];

/** 热门检索词 chip（中文标签 → 日文检索词）。 */
const HOT_KEYWORDS: { label: string; keyword: string }[] = [
  { label: "宝可梦卡", keyword: "ポケモンカード" },
  { label: "手办", keyword: "フィギュア" },
  { label: "球衣", keyword: "ユニフォーム" },
  { label: "毛绒公仔", keyword: "ぬいぐるみ" },
  { label: "一番赏", keyword: "一番くじ" },
  { label: "游戏王", keyword: "遊戯王" },
];

function sortItems(items: TcgCardItem[], sort: SortKey): TcgCardItem[] {
  if (sort === "newest") return items; // 列表端默认即最新上架顺序
  const withPrice = [...items];
  withPrice.sort((a, b) => {
    const pa = typeof a.priceJpy === "number" ? a.priceJpy : Number.POSITIVE_INFINITY;
    const pb = typeof b.priceJpy === "number" ? b.priceJpy : Number.POSITIVE_INFINITY;
    return sort === "priceAsc" ? pa - pb : pb - pa;
  });
  return withPrice;
}

function ZhMercariCard({
  item,
  jpyToCny,
}: {
  item: TcgCardItem;
  jpyToCny: number | null;
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const hasImage = Boolean(item.imageUrl) && !imgBroken;
  const cnyText = formatCnyApprox(item.priceJpy, jpyToCny);

  return (
    <Link
      href={`/mercari/${encodeURIComponent(item.goodsNo)}`}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md ${
        item.soldOut ? "opacity-60" : ""
      }`}
    >
      {/* 商品图 */}
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        {hasImage ? (
          <Image
            src={item.imageUrl as string}
            alt={item.title}
            fill
            unoptimized
            loading="lazy"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 200px"
            onError={() => setImgBroken(true)}
          />
        ) : (
          <ImagePlaceholder label="暂无图片" />
        )}

        {/* 平台徽章（左上） */}
        <span className="absolute left-2 top-2 inline-flex items-center rounded-md bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          煤炉
        </span>

        {/* 售罄徽章（右上，置灰） */}
        {item.soldOut && (
          <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-zinc-700/85 px-2 py-0.5 text-[10px] font-semibold text-white">
            已售
          </span>
        )}
      </div>

      {/* 文字内容 */}
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.4rem] text-xs leading-snug text-zinc-700">
          {item.title}
        </h3>

        <div className="mt-auto flex items-baseline gap-1.5">
          {typeof item.priceJpy === "number" ? (
            <span className="text-sm font-bold text-rose-600">
              ¥{item.priceJpy.toLocaleString("ja-JP")}
            </span>
          ) : (
            <span className="text-xs text-zinc-400">价格待询</span>
          )}
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

function ZhMercariCardSkeleton() {
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

export function ZhMercariList() {
  const [jpyToCny, setJpyToCny] = useState<number | null>(null);
  const [items, setItems] = useState<TcgCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // 输入框关键词（受控）与「已提交的检索词」分离：默认词进页面即拉货，
  // 搜索/选 chip 才改 submittedKeyword 触发刷新。
  const { keyword, setKeyword, submittedKeyword, setSubmittedKeyword } =
    usePlatformSearchKeyword(DEFAULT_KEYWORD);
  const [sort, setSort] = useState<SortKey>("newest");

  // 拉一次后台 CNY 汇率（拿不到则只显 JPY、不显 ≈元、不崩）。在异步回调里 setState。
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

  // 按已提交检索词拉在售列表（含已售，由卡片置灰；列表端不接 sort，前端本地排）。
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const result = await searchMercariTcg({
          keyword: submittedKeyword,
          page: 1,
          inStockOnly: false,
        });
        if (!active) return;
        setItems(result);
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
      // 空搜索回退到默认词，保证不留白。
      setSubmittedKeyword(q || DEFAULT_KEYWORD);
    },
    [keyword],
  );

  const selectHotKeyword = useCallback((kw: string) => {
    setKeyword("");
    setSubmittedKeyword(kw);
  }, []);

  const sortedItems = sortItems(items, sort);

  return (
    <div className="min-h-screen bg-zinc-50 pb-12">
      {/* 顶部：标题 + 大搜索框 + 热门词（暖色） */}
      <section className="bg-gradient-to-b from-rose-50 to-zinc-50 pb-6 pt-8">
        <div className="mx-auto w-full max-w-7xl px-4">
          <h1 className="mb-4 flex items-center gap-2 text-2xl font-bold text-zinc-900">
            <span className="text-2xl">🛍️</span>
            Mercari 煤炉 · 日本二手代购
          </h1>

          <form onSubmit={handleSearch} className="mx-auto max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索煤炉商品 / 卡牌 / 手办 / 球衣…（中文或日文）"
                className="h-12 w-full rounded-full border border-zinc-200 bg-white px-6 pr-24 text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-full bg-rose-600 px-6 text-sm font-medium text-white transition-colors hover:bg-rose-700"
              >
                搜索
              </button>
            </div>
          </form>

          {/* 热门检索词 chip */}
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-zinc-400">热门：</span>
            {HOT_KEYWORDS.map((hot) => (
              <button
                key={hot.keyword}
                type="button"
                onClick={() => selectHotKeyword(hot.keyword)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  submittedKeyword === hot.keyword && !keyword
                    ? "border-rose-400 bg-rose-50 text-rose-600"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-rose-300 hover:text-rose-600"
                }`}
              >
                {hot.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 工具条：当前检索词 + 排序（中文标签） */}
      <section className="mx-auto w-full max-w-7xl px-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-block h-4 w-1 rounded-full bg-gradient-to-b from-rose-500 to-orange-400" />
            <span>
              {keyword.trim() || submittedKeyword
                ? `当前检索：${keyword.trim() || submittedKeyword}`
                : "为你推荐"}
            </span>
            {!loading && (
              <span className="text-zinc-400">· 共 {sortedItems.length} 件在售</span>
            )}
          </div>

          {/* 排序下拉：原生 select，中文标签，无需 effect 同步 setState */}
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <span className="text-zinc-400">排序</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* 商品网格 / 加载骨架 / 空 + 失败友好兜底 */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <ZhMercariCardSkeleton key={i} />
            ))}
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
            {failed ? (
              <div className="mb-3 text-5xl">😵</div>
            ) : (
              <MascotScene name="search" alt="没有找到相关商品" className="mb-3" />
            )}
            <p className="text-base font-medium text-zinc-700">
              {failed ? "加载失败，请稍后重试" : "没有找到相关商品"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {failed ? "网络或服务暂时不可用" : "换个关键词，或点上方热门词试试"}
            </p>
            <button
              type="button"
              onClick={() => selectHotKeyword(DEFAULT_KEYWORD)}
              className="mt-4 rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              看看热门在售
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {sortedItems.map((item) => (
              <ZhMercariCard
                key={item.goodsNo}
                item={item}
                jpyToCny={jpyToCny}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
