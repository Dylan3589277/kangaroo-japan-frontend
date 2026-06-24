"use client";

import { useParams } from "next/navigation";
import { EnYahoofrimaList } from "@/components/yahoofrima/EnYahoofrimaList";
import { ZhYahoofrimaList } from "@/components/yahoofrima/ZhYahoofrimaList";

/**
 * /[lang]/yahoofrima — PayPayフリマ 搜索 + 列表页（含「粘贴商品链接」入口）。
 *
 * 数据源：实时抓 PayPayフリマ 公开搜索页 __NEXT_DATA__（经后端
 * /integrations/yahoofrima/list 代理，短缓存/限频/熔断，不落库）。
 * 点商品 → 现成详情页 /[lang]/yahoofrima/[id]。
 *
 * 按 locale 分支呈现，与详情页一致：
 * - en：设计 A 深色风（显 USD）。
 * - 其它语言（zh/经典）：经典暖色风（显 ≈元）。
 * 配色：Yahoo 红角标（只改 yahoofrima 页，与 Mercari/Rakuma 区分平台）。
 */
export default function YahoofrimaPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";

  if (lang === "en") {
    return <EnYahoofrimaList />;
  }
  return <ZhYahoofrimaList />;
}
