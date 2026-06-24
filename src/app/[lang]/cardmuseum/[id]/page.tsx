import { CardmuseumDetailClassic } from "@/components/cardmuseum/CardmuseumDetailClassic";
import { CardmuseumDetailDesignA } from "@/components/cardmuseum/CardmuseumDetailDesignA";

/**
 * /[lang]/cardmuseum/[id] — カードラッシュ ポケモン 商品详情页。
 *
 * 按 locale 分支呈现，与 rakuma 详情完全平行：
 * - en：设计 A（红黑卡牌风）CardmuseumDetailDesignA，显美元，TCG quote。
 * - 其它语言：经典版（浅色 + 红色点缀）CardmuseumDetailClassic，显人民币，中文 quote。
 *
 * 两个正文组件均为 client component，自行用 useParams() 读 id/lang；本页仅做 locale 路由。
 */
export default async function CardmuseumDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") {
    return <CardmuseumDetailDesignA />;
  }

  return <CardmuseumDetailClassic />;
}
