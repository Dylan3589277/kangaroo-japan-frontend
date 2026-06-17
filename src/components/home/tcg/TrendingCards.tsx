"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRightIcon } from "./icons";
import { TcgCard, TcgCardSkeleton } from "./TcgCard";
import { searchMercariTcg, type TcgCardItem } from "./tcg-data";
import { isNonCardName, selectTrendingKeywords } from "./tcg-keywords";

const GRID_SIZE = 12;
// 每个精准词最多取这么多张，避免单一卡名刷屏（聚合后再去重截断）。
const PER_QUERY_LIMIT = 6;
// 轮换周期：6 小时换一批热门词。窗口内同一桶号稳定，过 6h 自动换新。
const ROTATION_WINDOW_MS = 6 * 60 * 60 * 1000;
// 客户端缓存键前缀（按 6h 桶号区分），避免同窗口内每次刷新都重拉抖动。
const CACHE_PREFIX = "tcg.trending.v1";

// 当前 6 小时桶号：每过 6h +1，作为轮换种子 + 缓存命名空间。
function currentBucket(): number {
  return Math.floor(Date.now() / ROTATION_WINDOW_MS);
}

function cacheKey(bucket: number): string {
  return `${CACHE_PREFIX}:${bucket}`;
}

// 读同一 6h 桶的缓存卡（仅当本窗口已成功拉过）。SSR/无 storage 时返回 null。
function readCache(bucket: number): TcgCardItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(bucket));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as TcgCardItem[];
  } catch {
    return null;
  }
}

// 写当前桶缓存，并清掉旧桶（过 6h 的）键，避免 sessionStorage 堆积。
function writeCache(bucket: number, items: TcgCardItem[]): void {
  if (typeof window === "undefined" || items.length === 0) return;
  try {
    const store = window.sessionStorage;
    for (let i = store.length - 1; i >= 0; i--) {
      const key = store.key(i);
      if (key && key.startsWith(`${CACHE_PREFIX}:`) && key !== cacheKey(bucket)) {
        store.removeItem(key);
      }
    }
    store.setItem(cacheKey(bucket), JSON.stringify(items));
  } catch {
    // 配额/隐私模式失败：忽略，下次仍会现拉。
  }
}

// 并行拉一组词的在售卡，合并 → 去重 → 滤非卡周边 → 截断到 GRID_SIZE。
// 已有 seen/acc 时在其基础上追加（用于 primary 不足时继续补足）。
async function collectInStock(
  keywords: { query: string }[],
  seen: Set<string>,
  acc: TcgCardItem[],
): Promise<void> {
  const batches = await Promise.all(
    keywords.map((kw) =>
      searchMercariTcg({
        keyword: kw.query,
        inStockOnly: true, // 已剔除已售/无图：首页热门只放在售
        limit: PER_QUERY_LIMIT,
      }),
    ),
  );
  for (const batch of batches) {
    for (const item of batch) {
      if (acc.length >= GRID_SIZE) return;
      if (item.soldOut) continue; // 双保险：售罄不进首页热门
      if (seen.has(item.goodsNo)) continue;
      if (isNonCardName(item.title)) continue;
      seen.add(item.goodsNo);
      acc.push(item);
    }
  }
}

/**
 * 首页「在售热门卡片」区块（设计 A）。
 * 复用现有 Mercari 在售搜索（searchMercariTcg），展示真实在售、有图的前 12 张卡。
 * 轮换：每 6 小时换一批热门词；售罄下架并用在售卡补足到 12 张；6h 桶内走 sessionStorage 缓存稳态。
 * 取数失败/无结果时调用 onFallback()，由首页回退到「热门搜索芯片」，避免空/崩。
 */
export function TrendingCards({
  onFallback,
}: {
  onFallback?: () => void;
}) {
  const t = useTranslations("tcg.trending");
  // 首帧 SSR 与客户端水合都从「空 + loading」起步，避免读缓存导致水合不一致；
  // 缓存命中在 effect 里同步进来（数据获取/外部同步，属 set-state-in-effect 合法用途）。
  const [items, setItems] = useState<TcgCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const reportedFallback = useRef(false);

  useEffect(() => {
    let active = true;
    const bucket = currentBucket();

    (async () => {
      // 同 6h 桶缓存命中：直接用缓存，跳过网络（窗口内稳态、刷新不抖动）。
      // 放在异步分支里更新状态，避免在 effect 体内同步 setState（react-hooks 规则）。
      const cached = readCache(bucket);
      if (cached) {
        if (!active) return;
        setItems(cached);
        setLoading(false);
        return;
      }

      const { primary, backfill } = selectTrendingKeywords(bucket);

      const seen = new Set<string>();
      const result: TcgCardItem[] = [];

      // 1) 先拉主词（3 宝可梦 + 2 游戏王，按 6h 桶轮换）。
      await collectInStock(primary, seen, result);

      // 2) 在售不足 12：从轮换补足池里逐批续拉补齐（每批 2 个词），直到够数或词用尽。
      for (let i = 0; result.length < GRID_SIZE && i < backfill.length; i += 2) {
        await collectInStock(backfill.slice(i, i + 2), seen, result);
      }
      if (!active) return;

      const finalItems = result.slice(0, GRID_SIZE);

      if (finalItems.length > 0) {
        writeCache(bucket, finalItems);
        setItems(finalItems);
        setLoading(false);
        return;
      }

      // 全部热门词都没拿到在售卡：回退到热门搜索芯片。
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
