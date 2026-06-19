import { RakumaDetailClassic } from "@/components/rakuma/RakumaDetailClassic";
import { RakumaDetailDesignA } from "@/components/rakuma/RakumaDetailDesignA";

/**
 * /[lang]/rakuma/[id] — 楽天ラクマ 商品详情页。
 *
 * 按 locale 分支呈现，与 Mercari 详情完全平行：
 * - en：设计 A（深色高级感）RakumaDetailDesignA，显美元，TCG quote。
 * - 其它语言：经典版（浅色通用样式）RakumaDetailClassic，显人民币，中文 quote。
 *
 * 两个正文组件均为 client component，自行用 useParams() 读 id/lang；本页仅做 locale 路由。
 */
export default async function RakumaDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") {
    return <RakumaDetailDesignA />;
  }

  return <RakumaDetailClassic />;
}
