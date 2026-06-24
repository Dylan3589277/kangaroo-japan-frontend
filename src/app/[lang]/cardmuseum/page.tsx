"use client";

import { useParams } from "next/navigation";
import { EnCardmuseumList } from "@/components/cardmuseum/EnCardmuseumList";
import { ZhCardmuseumList } from "@/components/cardmuseum/ZhCardmuseumList";

/**
 * /[lang]/cardmuseum — カードラッシュ ポケモン 搜索 + 列表页。
 *
 * 数据源：实时抓 cardmuseum-pokemon.jp 公开搜索页（经后端 /integrations/cardmuseum/list 代理，
 * 短缓存/限频/熔断，不落库）。点商品 → 详情页 /[lang]/cardmuseum/[id]。
 *
 * 按 locale 分支呈现，与 rakuma 完全平行：
 * - en（tgc，日本卡片卖美国）：红黑卡牌风（显 USD）。
 * - 其它语言（zh/经典）：红色卡牌风（显 ≈元）。
 *
 * 单店宝可梦卡专营货源，直接服务 en/TCG 线。
 */
export default function CardmuseumPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";

  if (lang === "en") {
    return <EnCardmuseumList />;
  }
  return <ZhCardmuseumList />;
}
