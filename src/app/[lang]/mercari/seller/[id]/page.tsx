import { MercariSellerDesignA } from "@/components/mercari/MercariSellerDesignA";

/**
 * /[lang]/mercari/seller/[id] —— Mercari 卖家「其它在售」页。
 *
 * 入口：商品详情页（MercariDetailDesignA）点卖家块跳转，过去跳此路径会 404，本页补齐。
 *
 * 按 locale 分支：
 * - en：设计 A（深色高级感）MercariSellerDesignA，与详情页/搜索页外壳视觉连贯。
 * - 其它语言：当前先回退到同一英文设计 A（简版即可，先保 en 不 404）。后续若需中文版
 *   再单独加经典版，互不影响。
 *
 * 正文组件为 client component，自行用 useParams() 读 id/lang、useSearchParams() 读详情带过来的
 * 卖家基础信息（name/photo/ratings/num/verified），并用 seller 端点拉该卖家在售网格。
 * 本页仅做 locale 路由。
 */
export default async function MercariSellerPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  await params;
  return <MercariSellerDesignA />;
}
