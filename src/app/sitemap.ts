import { MetadataRoute } from "next";

const BASE_URL = "https://jp-buy.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // NOTE: Japanese (ja) is NOT configured in src/i18n/routing.ts locales.
  // If Japanese support is added to routing.ts, uncomment 'ja' below.
  const languages = ["zh", "en"] as const;
  
  // Static pages - public pages only (private pages excluded)
  const staticPages = [
    { path: "", priority: 1.0 },
    { path: "/products", priority: 0.9 },
    { path: "/compare", priority: 0.8 },
    { path: "/login", priority: 0.5 },
    { path: "/register", priority: 0.5 },
  ];

  const sitemap: MetadataRoute.Sitemap = [];

  // Add static pages for each language
  for (const lang of languages) {
    for (const page of staticPages) {
      sitemap.push({
        url: `${BASE_URL}/${lang}${page.path}`,
        lastModified: new Date(),
        changeFrequency: page.path === "" ? "daily" : "weekly",
        priority: page.priority,
      });
    }
  }

  return sitemap;
}
