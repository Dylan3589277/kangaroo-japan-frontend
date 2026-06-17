"use client";

import { useEffect, useState } from "react";
import { TcgCard, TcgCardSkeleton } from "./TcgCard";
import { searchMercariTcg, type TcgCardItem } from "./tcg-data";
import { isNonCardName } from "./tcg-keywords";

/**
 * 设计 A 落地页（/pokemon-cards、/yugioh-cards）共用的「真实在售网格」。
 *
 * 与首页 TrendingCards 的区别：本组件接收一个**固定关键词**（由落地页指定，
 * 如 ポケモンカード 151 / 遊戯王 25th），只拉这一个词的在售卡用于该 IP 落地页，
 * 不做 6h 轮换/缓存（落地页是 SEO 着陆，主体内容是静态文案；网格是「真货」佐证）。
 *
 * 数据源复用 searchMercariTcg → 后端 GET /integrations/mercari/list（真实在售）。
 * 仅展示在售、有图、非周边的前 count 张；取数失败/为空时整块隐藏，不报错、不留白。
 */
export function LiveListingGrid({
  keyword,
  count = 8,
}: {
  /** 日文查询词（用词库里验证过能出真卡的词，避开抓空词）。 */
  keyword: string;
  /** 网格张数上限（默认 8）。 */
  count?: number;
}) {
  const [items, setItems] = useState<TcgCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let active = true;
    // 重新取数时先回到 loading 态（显示骨架）——把 UI 同步到「正在取外部数据」，
    // 是该 effect 的合法用途。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    (async () => {
      const batch = await searchMercariTcg({
        keyword,
        inStockOnly: true, // 只放在售、有图
        limit: count * 2, // 多取一些，过滤周边后再截断
      });

      if (!active) return;

      const seen = new Set<string>();
      const filtered: TcgCardItem[] = [];
      for (const item of batch) {
        if (filtered.length >= count) break;
        if (item.soldOut) continue;
        if (seen.has(item.goodsNo)) continue;
        if (isNonCardName(item.title)) continue;
        seen.add(item.goodsNo);
        filtered.push(item);
      }

      setSettled(true);
      setItems(filtered);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [keyword, count]);

  // 取数完成但无在售卡：整块隐藏（落地页主体文案仍在，不留空网格）。
  if (settled && !loading && items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {loading
        ? Array.from({ length: count }).map((_, i) => <TcgCardSkeleton key={i} />)
        : items.map((item) => <TcgCard key={item.goodsNo} item={item} />)}
    </div>
  );
}
