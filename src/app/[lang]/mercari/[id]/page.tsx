import type { Metadata } from "next";
import { MercariDetailClassic } from "@/components/mercari/MercariDetailClassic";
import { MercariDetailDesignA } from "@/components/mercari/MercariDetailDesignA";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildCanonical, isIndexable } from "@/lib/seo";
import {
  fetchMercariDetailForSsr,
  MERCARI_ON_SALE,
  type MercariDetail,
} from "@/lib/server/mercari-detail";

/**
 * /[lang]/mercari/[id] —— Mercari 商品详情页。
 *
 * 按 locale 分支呈现，逻辑层（取数/getMercariQuote 报价/售罄/Buy now/Add to cart）两版共用：
 * - en：设计 A（深色高级感）MercariDetailDesignA，与新 TcgHeader/Footer 外壳视觉连贯。
 * - 其它语言：现有经典版（浅色通用样式）MercariDetailClassic，原样不变。
 *
 * SSR（2026-07-25）：**仅 en** 在服务端预取详情，用于 generateMetadata（真实卡名/价格
 * 进 title 与 OG）、Product JSON-LD、以及作为 initialDetail 让 SSR HTML 带上商品内容
 * ——此前服务端只吐约 853 字符空壳，Google 抓不到任何商品信息。
 * 其它语言完全走原路径（不预取、不出 metadata、不加 JSON-LD），行为零变化。
 */

/** en 详情页的 SEO 文案模板：卡名是日文原名（型号/罗马数字是英文买家的实际搜索词）。 */
function buildEnMetadata(
  detail: MercariDetail,
  lang: string,
  id: string,
): Metadata {
  const canonical = buildCanonical(lang, `mercari/${id}`);
  const soldOut = detail.status !== MERCARI_ON_SALE;
  // 根 layout 的 titleTemplate 是 `%s | Kangaroo Japan`，所以这里不带品牌名，
  // 否则渲染成「… – Kangaroo Japan | Kangaroo Japan」。og:title 不走 template，
  // 是分享卡片上唯一的标题，故单独带上品牌。
  const title = `${detail.goods_name} | Buy from Japan`;
  const ogTitle = `${title} – Kangaroo Japan`;
  const description = soldOut
    ? `${detail.goods_name} — this Japanese listing has sold. Search live Pokémon and Yu-Gi-Oh cards from Japan; we buy, inspect and ship to the U.S.`
    : `Buy ${detail.goods_name} from Japan for ¥${detail.price.toLocaleString("en-US")}. We buy it in Japan on your behalf, photograph the card before it ships, and send it to your U.S. address.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      type: "website",
      images: detail.imgurls?.length ? [{ url: detail.imgurls[0] }] : undefined,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}): Promise<Metadata> {
  const { lang, id } = await params;

  // 只有 en 走 SSR 元数据；其它语言保持原样（继承 layout 默认 metadata）。
  if (lang !== "en") return {};

  const detail = await fetchMercariDetailForSsr(id);
  if (!detail) return {};

  return buildEnMetadata(detail, lang, id);
}

/** Product 结构化数据：把卡名、图、价格与在售状态喂给搜索引擎。金额为 JPY 整数。 */
function productJsonLd(
  detail: MercariDetail,
  lang: string,
  id: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: detail.goods_name,
    sku: detail.goods_no,
    image: detail.imgurls?.length ? detail.imgurls : undefined,
    description: detail.description || detail.goods_name,
    offers: {
      "@type": "Offer",
      price: detail.price,
      priceCurrency: "JPY",
      availability:
        detail.status === MERCARI_ON_SALE
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: buildCanonical(lang, `mercari/${id}`),
    },
  };
}

export default async function MercariGoodsDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;

  if (lang === "en") {
    // 取数失败返回 null → 组件退回原来的纯客户端渲染，页面照常工作。
    const detail = await fetchMercariDetailForSsr(id);
    return (
      <>
        {detail && isIndexable(lang) && (
          <JsonLd data={productJsonLd(detail, lang, id)} />
        )}
        <MercariDetailDesignA initialDetail={detail} />
      </>
    );
  }

  return <MercariDetailClassic />;
}
