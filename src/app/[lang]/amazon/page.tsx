import type { Metadata } from "next";
import { buildCanonical } from "@/lib/seo";
import { AmazonComingSoon } from "./AmazonComingSoon";
import { AmazonSearchPage } from "./AmazonSearchPage";

/**
 * /[lang]/amazon —— 按 locale 分流。
 *
 * - en：Amazon Japan 尚未接通（实测英文/日文关键词都搜不出结果），首页也已标
 *   Coming soon，这里给一致的占位页，并把人导回真正可用的 Mercari / Yahoo。
 * - 其它语言：保持原有的搜索页，行为一字不变。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (lang !== "en") return {};

  const title = "Amazon Japan — coming soon";
  return {
    title,
    description:
      "Amazon Japan sourcing isn't live yet. Buy Japanese Pokémon and Yu-Gi-Oh cards from Mercari Japan today, or browse Yahoo! Auctions.",
    alternates: { canonical: buildCanonical(lang, "amazon") },
    // 还没有真实商品的占位页，别让它进索引跟正经落地页抢曝光。
    robots: { index: false, follow: true },
  };
}

export default async function AmazonPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (lang === "en") return <AmazonComingSoon lang={lang} />;

  return <AmazonSearchPage />;
}
