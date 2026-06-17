import { MercariDetailClassic } from "@/components/mercari/MercariDetailClassic";
import { MercariDetailDesignA } from "@/components/mercari/MercariDetailDesignA";

/**
 * /[lang]/mercari/[id] —— Mercari 商品详情页。
 *
 * 按 locale 分支呈现，逻辑层（取数/getMercariQuote 报价/售罄/Buy now/Add to cart）两版共用：
 * - en：设计 A（深色高级感）MercariDetailDesignA，与新 TcgHeader/Footer 外壳视觉连贯。
 * - 其它语言：现有经典版（浅色通用样式）MercariDetailClassic，原样不变。
 *
 * 两个正文组件均为 client component，自行用 useParams() 读 id/lang；本页仅做 locale 路由。
 */
export default async function MercariGoodsDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") {
    return <MercariDetailDesignA />;
  }

  return <MercariDetailClassic />;
}
