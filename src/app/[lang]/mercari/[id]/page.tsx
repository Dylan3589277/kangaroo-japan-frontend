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
import { translateTitleJaToEn } from "@/lib/server/translate";

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

/**
 * en 详情页的 SEO 文案模板。
 * 标题优先用英文译名（美国买家读得懂、拿得到英文长尾流量），日文原名放进 description
 * 保留精确匹配；翻译不可用时整体回退日文原名，不影响任何其它字段。
 */
function buildEnMetadata(
  detail: MercariDetail,
  lang: string,
  id: string,
  nameEn: string | null,
): Metadata {
  const canonical = buildCanonical(lang, `mercari/${id}`);
  const soldOut = detail.status !== MERCARI_ON_SALE;
  const displayName = nameEn ?? detail.goods_name;
  // 有译名时把日文原名也带进 description，兼顾英文可读与日文精确搜索。
  const alsoJa = nameEn ? ` (Japanese title: ${detail.goods_name})` : "";
  // 根 layout 的 titleTemplate 是 `%s | Kangaroo Japan`，所以这里不带品牌名，
  // 否则渲染成「… – Kangaroo Japan | Kangaroo Japan」。og:title 不走 template，
  // 是分享卡片上唯一的标题，故单独带上品牌。
  const title = `${displayName} | Buy from Japan`;
  const ogTitle = `${title} – Kangaroo Japan`;
  const description = soldOut
    ? `${displayName}${alsoJa} — this Japanese listing has sold. Search live Pokémon and Yu-Gi-Oh cards from Japan; we buy, inspect and ship to the U.S.`
    : `Buy ${displayName}${alsoJa} from Japan for ¥${detail.price.toLocaleString("en-US")}. We buy it in Japan on your behalf, photograph the card before it ships, and send it to your U.S. address.`;

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

  // 翻译失败返回 null → 全套文案回退日文原名。与下面页面里的调用同参数，
  // 命中 unstable_cache 同一条，不会重复打 Azure。
  const nameEn = await translateTitleJaToEn(detail.goods_name);

  return buildEnMetadata(detail, lang, id, nameEn);
}

/** Product 结构化数据：把卡名、图、价格与在售状态喂给搜索引擎。金额为 JPY 整数。 */
function productJsonLd(
  detail: MercariDetail,
  lang: string,
  id: string,
  nameEn: string | null,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    // name 与页面 h1/title 保持一致用英文译名；日文原名放 alternateName，
    // 两边都喂给搜索引擎，避免结构化数据与可见标题给出不一致的信号。
    name: nameEn ?? detail.goods_name,
    alternateName: nameEn ? detail.goods_name : undefined,
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
    const nameEn = detail
      ? await translateTitleJaToEn(detail.goods_name)
      : null;
    return (
      <>
        {detail && isIndexable(lang) && (
          <JsonLd data={productJsonLd(detail, lang, id, nameEn)} />
        )}
        <MercariDetailDesignA initialDetail={detail} nameEn={nameEn} />
      </>
    );
  }

  return <MercariDetailClassic />;
}
