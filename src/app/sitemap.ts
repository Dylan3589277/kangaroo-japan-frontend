import { MetadataRoute } from "next";
import { BASE_URL, INDEXABLE_LOCALES } from "@/lib/seo";

// 内容改版时手动往后拨（保持确定性、不用构建时间造假的"每次部署都更新"）。
// 2026-07-03：FAQ 扩充 + 新增 guides + 全站结构化数据。
// 2026-08-17：新增 zh 侧中文 GEO 长文指南。
const LAST_MODIFIED = new Date("2026-08-17T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  // 所有 locale 都存在的公开页（内容页非 en 时回退英文，仍可访问可索引）。
  const staticPages: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    /**
     * en 侧不报该路由。用于 zh 等 locale 是正常功能页、但 en(TCG) 侧尚未改版的路由——
     * 报给 Google 只会收录到空壳页。en 的等价入口是 /en/cards。
     */
    skipEn?: boolean;
    /**
     * zh 侧不报该路由。用于 zh 正文尚未中文化、报给 Google 只会收录到
     * 「标题中文正文英文」低质页面的路由。
     * 2026-07-26：faq/fees/how-it-works/buyer-protection/photo-inspection/about
     * 六页的 zh 正文已补齐并随本批上线，标记已撤除；机制保留备用。
     */
    skipZh?: boolean;
  }> = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    // 2026-07-25：/en/products 实测为未改版模板 + "No products found"，故 en 不报。
    { path: "/products", priority: 0.9, changeFrequency: "weekly", skipEn: true },
    // skipEn：/en/compare 目前是空壳（正文仅约 1.1k 字符、还共用首页 title），
    // 收录它只会给 Google 一个低质页面。等这页真正有内容再放回来。
    { path: "/compare", priority: 0.8, changeFrequency: "weekly", skipEn: true },
    { path: "/pokemon-cards", priority: 0.9, changeFrequency: "weekly" },
    { path: "/yugioh-cards", priority: 0.9, changeFrequency: "weekly" },
    { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
    { path: "/fees", priority: 0.8, changeFrequency: "monthly" },
    { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" },
    { path: "/buyer-protection", priority: 0.6, changeFrequency: "monthly" },
    { path: "/photo-inspection", priority: 0.6, changeFrequency: "monthly" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
  ];

  // 英文限定的 GEO 长文指南（其它 locale 访问会 noindex 并 canonical 指向 en，
  // 故 sitemap 只报 en 版）。
  const enOnlyPages: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/guides", priority: 0.7, changeFrequency: "weekly" },
    { path: "/guides/japan-card-import-tax-us-2026", priority: 0.8, changeFrequency: "weekly" },
    { path: "/guides/kangaroo-japan-vs-buyee-vs-zenmarket", priority: 0.8, changeFrequency: "monthly" },
    { path: "/guides/how-to-buy-pokemon-cards-from-mercari-japan", priority: 0.8, changeFrequency: "monthly" },
    { path: "/guides/is-buyee-legit-2026", priority: 0.8, changeFrequency: "monthly" },
    { path: "/guides/japan-proxy-hidden-fees-2026", priority: 0.8, changeFrequency: "monthly" },
    { path: "/guides/psa-graded-cards-from-japan-2026", priority: 0.8, changeFrequency: "monthly" },
  ];

  // 中文限定的 GEO 长文指南（日本代购/代拍，写给中国买家；其它 locale 访问会
  // noindex 并 canonical 指回 zh，故 sitemap 只报 zh 版）。
  // 2026-08-17：首批 5 篇已全部落地为真实路由，与 guides hub 的 GUIDES_ZH 一一对应。
  const zhOnlyPages: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "/guides", priority: 0.7, changeFrequency: "weekly" },
    { path: "/guides/mercari-daigou-fee-comparison-2026", priority: 0.8, changeFrequency: "weekly" },
    { path: "/guides/japan-daipai-platforms-2026", priority: 0.8, changeFrequency: "weekly" },
    { path: "/guides/japan-daigou-shipping-cost-guide", priority: 0.8, changeFrequency: "weekly" },
    { path: "/guides/japan-daigou-newbie-guide", priority: 0.8, changeFrequency: "weekly" },
    { path: "/guides/daigou-human-vs-bot-service", priority: 0.8, changeFrequency: "weekly" },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const lang of INDEXABLE_LOCALES) {
    for (const page of staticPages) {
      if (page.skipEn && lang === "en") continue;
      if (page.skipZh && lang === "zh") continue;
      entries.push({
        url: `${BASE_URL}/${lang}${page.path}`,
        lastModified: LAST_MODIFIED,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
      });
    }
  }

  for (const page of enOnlyPages) {
    entries.push({
      url: `${BASE_URL}/en${page.path}`,
      lastModified: LAST_MODIFIED,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

  for (const page of zhOnlyPages) {
    entries.push({
      url: `${BASE_URL}/zh${page.path}`,
      lastModified: LAST_MODIFIED,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

  return entries;
}
