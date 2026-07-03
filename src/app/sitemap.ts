import { MetadataRoute } from "next";
import { BASE_URL, INDEXABLE_LOCALES } from "@/lib/seo";

// 内容改版时手动往后拨（保持确定性、不用构建时间造假的"每次部署都更新"）。
// 2026-07-03：FAQ 扩充 + 新增 guides + 全站结构化数据。
const LAST_MODIFIED = new Date("2026-07-03T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  // 所有 locale 都存在的公开页（内容页非 en 时回退英文，仍可访问可索引）。
  const staticPages: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    { path: "/products", priority: 0.9, changeFrequency: "weekly" },
    { path: "/compare", priority: 0.8, changeFrequency: "weekly" },
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
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const lang of INDEXABLE_LOCALES) {
    for (const page of staticPages) {
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

  return entries;
}
