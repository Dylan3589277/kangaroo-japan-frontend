"use client";

import { useParams } from "next/navigation";
import { EnToretokuList } from "@/components/toretoku/EnToretokuList";
import { ZhToretokuList } from "@/components/toretoku/ZhToretokuList";

/**
 * /[lang]/toretoku — トレトク 搜索 + 列表页。
 *
 * 数据源：实时抓 toretoku.jp 公开 SSR 搜索页（经后端 /integrations/toretoku/list 代理，
 * 短缓存/限频/熔断，不落库；只取在售，绝不取買取报价）。点商品 → 详情页 /[lang]/toretoku/[id]。
 *
 * 按 locale 分支呈现，与 cardrush 完全平行：
 * - en（tgc，日本卡片卖美国）：橙红卡牌风（显 USD）。
 * - 其它语言（zh/经典）：橙红卡牌风（显 ≈元）。
 *
 * トレトク 通販+買取兼营的 TCG 综合店，货含 型番/卡况rank，直接服务 en/TCG 线。
 */
export default function ToretokuPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";

  if (lang === "en") {
    return <EnToretokuList />;
  }
  return <ZhToretokuList />;
}
