"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRightIcon } from "./icons";
import { TcgCard, TcgCardSkeleton } from "./TcgCard";
import { searchMercariTcg, type TcgCardItem } from "./tcg-data";

const GRID_SIZE = 8;

// 热门 TCG 查询（日文命中率最高，能出数）。首选「ポケモン」，其次「遊戯王」兜底。
// 注意：别用「ポケモンカード」——旧 mericaris 列表端对该词会抓空。
const TRENDING_QUERIES = ["ポケモン", "遊戯王"] as const;

/**
 * 首页「在售热门卡片」区块（设计 A）。
 * 复用现有 Mercari 在售搜索（searchMercariTcg），展示真实在售、有图的前 8 张卡。
 * 取数失败/无结果时调用 onFallback()，由首页回退到「热门搜索芯片」，避免空/崩。
 */
export function TrendingCards({
  onFallback,
}: {
  onFallback?: () => void;
}) {
  const t = useTranslations("tcg.trending");
  const [items, setItems] = useState<TcgCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const reportedFallback = useRef(false);

  useEffect(() => {
    let active = true;

    (async () => {
      for (const query of TRENDING_QUERIES) {
        if (!active) return;
        const result = await searchMercariTcg({
          keyword: query,
          inStockOnly: true,
          limit: GRID_SIZE,
        });
        if (!active) return;
        if (result.length > 0) {
          setItems(result);
          setLoading(false);
          return;
        }
      }
      // 所有查询都没拿到在售卡：回退到热门搜索芯片。
      if (!active) return;
      setLoading(false);
      if (!reportedFallback.current) {
        reportedFallback.current = true;
        onFallback?.();
      }
    })();

    return () => {
      active = false;
    };
  }, [onFallback]);

  // 取数失败且无任何卡：隐藏整块（首页已回退到芯片）。
  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-white/[0.06] bg-[#0a0e16]">
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-white md:text-3xl">
              {t("title")}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">{t("subtitle")}</p>
          </div>
          <Link
            href="/cards"
            className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white sm:inline-flex"
          >
            {t("viewAll")}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {loading
            ? Array.from({ length: GRID_SIZE }).map((_, i) => (
                <TcgCardSkeleton key={i} />
              ))
            : items.map((item) => <TcgCard key={item.goodsNo} item={item} />)}
        </div>

        {/* 移动端的 View all 入口 */}
        <div className="mt-8 sm:hidden">
          <Link
            href="/cards"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-white"
          >
            {t("viewAll")}
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
