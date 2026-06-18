"use client";

import { useParams } from "next/navigation";
import { EnMercariList } from "@/components/mercari/EnMercariList";
import { ZhMercariList } from "@/components/mercari/ZhMercariList";

/**
 * Mercari 煤炉列表页分发：
 *  - en（设计 A，面向海外）→ EnMercariList（原实现，原样不动）。
 *  - 其它语言（zh/经典）→ ZhMercariList（中国导购风，暖色、默认有货、中文化排序）。
 */
export default function MercariPage() {
  const params = useParams();
  const lang = (params.lang as string) || "zh";

  if (lang === "en") {
    return <EnMercariList />;
  }
  return <ZhMercariList />;
}
