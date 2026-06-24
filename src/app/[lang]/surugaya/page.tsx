"use client";

import { useParams } from "next/navigation";
import { EnSurugayaList } from "@/components/surugaya/EnSurugayaList";
import { ZhSurugayaList } from "@/components/surugaya/ZhSurugayaList";

/**
 * /[lang]/surugaya — 駿河屋 Surugaya 搜索 + 列表页（含「粘贴商品链接」入口）。
 *
 * 数据源：实时抓 suruga-ya.jp 公开搜索 SSR 页（经后端 /integrations/surugaya/list 代理，
 * 短缓存/限频/熔断，不落库）。点商品 → 详情页 /[lang]/surugaya/[id]。
 * 駿河屋核心：列表每条同时展示 新品/中古 双价。
 *
 * 按 locale 分支呈现，与详情页一致：
 * - en：设计 A 深色风（显 USD）。
 * - 其它语言（zh/经典）：经典浅色风（显 ≈元）。
 */
export default function SurugayaPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";

  if (lang === "en") {
    return <EnSurugayaList />;
  }
  return <ZhSurugayaList />;
}
