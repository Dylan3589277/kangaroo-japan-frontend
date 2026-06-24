import { SurugayaDetailClassic } from "@/components/surugaya/SurugayaDetailClassic";
import { SurugayaDetailDesignA } from "@/components/surugaya/SurugayaDetailDesignA";

/**
 * /[lang]/surugaya/[id] — 駿河屋 Surugaya 商品详情页。
 *
 * 按 locale 分支呈现，与 Rakuma 详情完全平行：
 * - en：设计 A（深色高级感）SurugayaDetailDesignA，显美元，TCG quote。
 * - 其它语言：经典版（浅色通用样式）SurugayaDetailClassic，显人民币，中文 quote。
 * 駿河屋核心：价格区同时展示 新品/中古 双价。
 *
 * 两个正文组件均为 client component，自行用 useParams() 读 id/lang；本页仅做 locale 路由。
 */
export default async function SurugayaDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") {
    return <SurugayaDetailDesignA />;
  }

  return <SurugayaDetailClassic />;
}
