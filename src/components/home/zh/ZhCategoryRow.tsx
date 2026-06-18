"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  fetchCategoryItems,
  type ZhCategoryConfig,
  type ZhHomeItem,
} from "./zh-daigou-data";
import { ZhProductCard, ZhProductCardSkeleton } from "./ZhProductCard";

/**
 * 热门品类推荐区的单个品类块（核心区块）。
 * mount 后并发拉 Mercari + 雅虎在售卡（fetchCategoryItems），合并去重取前 ROW_SIZE 张。
 * 三态：加载显骨架 / 成功显横滑卡片 / 失败或为空隐藏整块（return null，不留白不报错）。
 * 取数在 effect 的异步回调里 setState（不在 effect 体内同步 setState，符合 husky 规则）。
 */

const ROW_SIZE = 10;

export function ZhCategoryRow({
  config,
  jpyToCny,
}: {
  config: ZhCategoryConfig;
  jpyToCny: number | null;
}) {
  const [items, setItems] = useState<ZhHomeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const result = await fetchCategoryItems(config.keyword, ROW_SIZE);
      if (!active) return;
      setItems(result);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [config.keyword]);

  // 取数失败 / 无在售卡：隐藏整块，不留白。
  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
          <span className="inline-block h-4 w-1 rounded-full bg-gradient-to-b from-rose-500 to-orange-400" />
          {config.title}
        </h3>
        <Link
          href={`/yahoo?kw=${encodeURIComponent(config.keyword)}`}
          className="text-xs font-medium text-rose-600 hover:text-rose-700"
        >
          查看更多 →
        </Link>
      </div>

      {/* 横滑卡片行：移动端横向滚动，桌面端铺满。 */}
      <div className="-mx-1 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4 lg:grid-cols-5">
        {loading
          ? Array.from({ length: ROW_SIZE }).map((_, i) => (
              <div key={i} className="w-36 shrink-0 sm:w-auto">
                <ZhProductCardSkeleton />
              </div>
            ))
          : items.map((item) => (
              <div
                key={`${item.platform}:${item.goodsNo}`}
                className="w-36 shrink-0 sm:w-auto"
              >
                <ZhProductCard item={item} jpyToCny={jpyToCny} />
              </div>
            ))}
      </div>
    </section>
  );
}
