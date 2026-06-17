"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRightIcon } from "./icons";
import { TcgCard, TcgCardSkeleton } from "./TcgCard";
import { searchMercariTcg, type TcgCardItem } from "./tcg-data";
import {
  POKEMON_KEYWORDS,
  YUGIOH_KEYWORDS,
  isNonCardName,
  type TcgKeyword,
} from "./tcg-keywords";

const GRID_SIZE = 12;
// 每个精准词最多取这么多张，避免单一卡名刷屏（聚合后再去重截断）。
const PER_QUERY_LIMIT = 6;

// 简单的「按天轮换」选词：同一天稳定（避免水合不一致），跨天换一批，保持新鲜。
function pickRotating<T>(pool: readonly T[], count: number, seed: number): T[] {
  if (pool.length <= count) return [...pool];
  const start = seed % pool.length;
  const out: T[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pool[(start + i) % pool.length]);
  }
  return out;
}

// 首页热门卡聚合词：混 3 个宝可梦热门 + 2 个游戏王热门，按天轮换。
// 全部来自实测能出真卡的精准词库（tcg-keywords），不再用泛词「ポケモン」「遊戯王」。
function selectTrendingKeywords(): TcgKeyword[] {
  const daySeed = Math.floor(Date.now() / 86_400_000); // 当天 0 点起的天数
  return [
    ...pickRotating(POKEMON_KEYWORDS, 3, daySeed),
    ...pickRotating(YUGIOH_KEYWORDS, 2, daySeed),
  ];
}

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
      const keywords = selectTrendingKeywords();

      // 并行拉取每个精准词的在售卡（各取前 PER_QUERY_LIMIT 张）。
      const batches = await Promise.all(
        keywords.map((kw) =>
          searchMercariTcg({
            keyword: kw.query,
            inStockOnly: true, // 已剔除已售/无图
            limit: PER_QUERY_LIMIT,
          }),
        ),
      );
      if (!active) return;

      // 合并 → 按 goodsNo 去重 → 过滤非卡周边（钥匙扣/扭蛋/玩偶…）→ 截断。
      const seen = new Set<string>();
      const merged: TcgCardItem[] = [];
      for (const batch of batches) {
        for (const item of batch) {
          if (seen.has(item.goodsNo)) continue;
          if (isNonCardName(item.title)) continue;
          seen.add(item.goodsNo);
          merged.push(item);
        }
      }
      const result = merged.slice(0, GRID_SIZE);

      if (result.length > 0) {
        setItems(result);
        setLoading(false);
        return;
      }

      // 全部精准词都没拿到在售卡：回退到热门搜索芯片。
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
