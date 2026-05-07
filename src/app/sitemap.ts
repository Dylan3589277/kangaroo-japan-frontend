import { MetadataRoute } from "next";
import { BASE_URL, INDEXABLE_LOCALES } from "@/lib/seo";

const LAST_MODIFIED = new Date("2026-05-07T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: Array<{
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }> = [
    { path: "", priority: 1.0, changeFrequency: "daily" },
    { path: "/products", priority: 0.9, changeFrequency: "weekly" },
    { path: "/compare", priority: 0.8, changeFrequency: "weekly" },
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

  return entries;
}
