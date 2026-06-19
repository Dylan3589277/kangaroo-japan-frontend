"use client";

import { useParams } from "next/navigation";
import { EnRakumaList } from "@/components/rakuma/EnRakumaList";
import { ZhRakumaList } from "@/components/rakuma/ZhRakumaList";

/**
 * /[lang]/rakuma — 楽天ラクマ 搜索 + 列表页（含「粘贴商品链接」入口）。
 *
 * 数据源：实时抓 fril.jp 公开搜索页（经后端 /integrations/rakuma/list 代理，
 * 短缓存/限频/熔断，不落库）。点商品 → 现成详情页 /[lang]/rakuma/[id]。
 *
 * 按 locale 分支呈现，与详情页一致：
 * - en：设计 A 深色风（显 USD）。
 * - 其它语言（zh/经典）：经典暖色风（显 ≈元）。
 */
export default function RakumaPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";

  if (lang === "en") {
    return <EnRakumaList />;
  }
  return <ZhRakumaList />;
}
