/**
 * 服务端取 Mercari 商品详情——供 en TCG 详情页做 SSR / generateMetadata / JSON-LD。
 *
 * 为什么要有这一层：详情页正文是 client component，服务端原本只吐出一个空壳
 * （实测约 853 字符正文、零价格零卡况），Google 抓不到任何商品内容，搜索
 * 「卡名 + 关键词」永远进不来。这里在服务端先把详情取好，用于：
 *   ① generateMetadata：真实卡名/价格进 title、description、OG image
 *   ② Product JSON-LD：把价格与在售状态喂给搜索引擎
 *   ③ 作为 initialDetail 传给正文组件，让 SSR HTML 里就有内容（同时消掉首屏 loading）
 *
 * 该端点未登录可取（生产实测 POST 返 200 + success:true），所以这里不带任何凭证；
 * 用户相关状态（collect / cart）服务端拿不到也不该拿，由客户端 hydrate 后自行补齐。
 *
 * 注意：不加 `server-only` —— 组件侧要 `import type` 这里的 MercariDetail，
 * 保持类型单一来源；类型引用在编译期被擦除，不会把本模块带进客户端 bundle。
 */

/** 与 next.config.mjs 的 backendOrigin 解析保持一致（改那边记得同步这里）。 */
const BACKEND_ORIGIN = (
  process.env.KANGAROO_JAPAN_BACKEND_ORIGIN ||
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN ||
  "https://kangaroo-japan-backend.vercel.app"
).replace(/\/$/, "");

/** 商品在售状态：只有 on_sale 才对搜索引擎报 InStock。 */
export const MERCARI_ON_SALE = "on_sale";

export interface MercariDetail {
  goods_no: string;
  goods_name: string;
  price: number;
  // 单品美元价（= 商品价 × 后台 USD 汇率，不含手续费；后端 mdetail 公开附加字段，
  // 未登录访客也有）。汇率不可用/无价时后端不返回 → 可空。ITEM PRICE 优先用它。
  price_usd?: number;
  price_rmb: number;
  rate: number;
  description: string;
  imgurls: string[];
  content: string;
  status: string;
  url: string;
  collect: boolean;
  cart: boolean;
  seller_info: {
    id: string;
    name: string;
    photo_url: string;
    score: number;
    num_sell_items: number;
    num_ratings?: number;
    // 评价分项 + 本人认证标记（后端 mdetail 透传）；用于卖家页头部 + 认证徽章。可空。
    ratings?: { good?: number; normal?: number; bad?: number };
    register_sms_confirmation?: string;
  };
  extras: { name: string; value: string }[];
  bid_count?: number;
  remain_time?: string;
}

/**
 * 取详情，失败一律返回 null——**绝不让取数失败把整页打成 500**：
 * 拿不到就退回原来的纯客户端渲染路径（页面照常工作，只是少了 SSR 内容）。
 *
 * 缓存：本项目未启用 cacheComponents，走旧模型 `next.revalidate`。
 * 5 分钟——商品价格与售罄状态会变，但详情页不是秒级行情，5 分钟足够新鲜，
 * 同时挡住爬虫/刷页对后端的重复回源。
 */
export async function fetchMercariDetailForSsr(
  id: string,
): Promise<MercariDetail | null> {
  if (!id) return null;

  try {
    const res = await fetch(
      `${BACKEND_ORIGIN}/api/v1/integrations/mercari/detail`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
        next: { revalidate: 300 },
      },
    );

    if (!res.ok) return null;

    const json = await res.json();
    // 后端形状：{ success, data: {...} }；历史上也出现过 { detail } / 裸对象，
    // 与客户端组件的解析口径保持一致，避免两边对同一响应有两种理解。
    const payload = (json?.data ?? json?.detail ?? json) as
      | (MercariDetail & { raw?: unknown })
      | undefined;

    if (!payload?.goods_name) return null;

    // 丢掉 raw（Mercari 原始响应，体积大且页面用不到）——它会被序列化进 HTML。
    const { raw: _raw, ...detail } = payload;
    return detail as MercariDetail;
  } catch {
    return null;
  }
}
