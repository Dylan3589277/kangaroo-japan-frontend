import { MercariSellerDesignA } from "@/components/mercari/MercariSellerDesignA";
import { MercariSellerClassic } from "@/components/mercari/MercariSellerClassic";

/**
 * /[lang]/mercari/seller/[id] —— Mercari 卖家「其它在售」页。
 *
 * 入口：商品详情页（MercariDetailDesignA / MercariDetailClassic）点卖家块跳转。
 *
 * 按 locale 分支：
 * - en：设计 A（深色高级感 TCG）MercariSellerDesignA，与英文详情页/搜索页外壳视觉连贯。
 * - 其它语言（含 zh）：经典版 MercariSellerClassic（亮色暖调 / 中文，¥JPY + ≈元，绝不显美元）。
 *
 * 两个正文组件均为 client component，自行用 useParams() 读 id/lang、useSearchParams() 读详情带过来的
 * 卖家基础信息，并用 seller 端点拉该卖家在售网格。本页仅做 locale 路由。
 */
export default async function MercariSellerPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang } = await params;
  return lang === "en" ? <MercariSellerDesignA /> : <MercariSellerClassic />;
}
