"use client";

import { useParams } from "next/navigation";
import { EnTorecacampList } from "@/components/torecacamp/EnTorecacampList";
import { ZhTorecacampList } from "@/components/torecacamp/ZhTorecacampList";

/**
 * /[lang]/torecacamp — トレカキャンプ（宝可梦卡）搜索 + 列表页（含「粘贴商品链接」入口）。
 *
 * 数据源：Shopify 官方公开 /products.json（经后端 /integrations/torecacamp/list 代理，
 * 服务端按关键词过滤，短缓存/限频/熔断，不落库）。点商品 → 详情页 /[lang]/torecacamp/[id]。
 *
 * 按 locale 分支呈现，与详情页一致：
 * - en：设计 A 深色风（宝可梦露营绿，显 USD）。
 * - 其它语言（zh/经典）：经典风（显 ≈元）。
 */
export default function TorecacampPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";

  if (lang === "en") {
    return <EnTorecacampList />;
  }
  return <ZhTorecacampList />;
}
