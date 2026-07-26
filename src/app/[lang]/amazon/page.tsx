import type { Metadata } from "next";
import { buildCanonical } from "@/lib/seo";
import { AmazonComingSoon } from "./AmazonComingSoon";
import { AmazonComingSoonZh } from "./AmazonComingSoonZh";

/**
 * /[lang]/amazon —— 全语言占位页（2026-07-26 花哥拍板：亚马逊改 coming soon）。
 *
 * 亚马逊日本**没有接通**：后端 `/integrations/amazon/search` 实测返回
 * `{"success":true,"data":[]}`。此前只有 en 走占位页，其它语言仍渲染
 * `AmazonSearchPage` 真实搜索页——搜不出东西却摆成可用平台，是对买家的虚假陈述。
 *
 * - en：TCG 深色占位页 `AmazonComingSoon`（原样不动）。
 * - 其它语言：浅色中文占位页 `AmazonComingSoonZh`，CTA 导回真正可用的煤炉 / 雅虎竞拍。
 *
 * 接通后把两个分支换回各自的搜索页即可；`AmazonSearchPage` 组件保留未删。
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  const canonical = { alternates: { canonical: buildCanonical(lang, "amazon") } };

  if (lang !== "en") {
    return {
      // 不要在这里写「| 袋鼠君」——layout 的 title.template 会自动补品牌后缀，
      // 手写会变成「… | 袋鼠君 | 袋鼠君」（本仓 commit 1aae0ac 修过同类问题）。
      title: "亚马逊日本代购 — 发链接给客服人工代购",
      description:
        "日本亚马逊商品可代购：站内暂不支持自动搜索，把商品链接发给客服确认价格即可下单，代购手续费 220 円/件，全球直邮。",
      // zh 侧可索引：日亚是真实在做的业务（客服人工接单，老后台 st_shops 里
      // amazon is_show=1、手续费 220 円），这页承载「日本亚马逊代购」的搜索需求。
      ...canonical,
    };
  }

  // en 侧才是真占位（Amazon Japan 尚未接通），保持 noindex，别跟正经落地页抢曝光。
  return {
    title: "Amazon Japan — coming soon",
    description:
      "Amazon Japan sourcing isn't live yet. Buy Japanese Pokémon and Yu-Gi-Oh cards from Mercari Japan today, or browse Yahoo! Auctions.",
    ...canonical,
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

  return <AmazonComingSoonZh />;
}
