import { MetadataRoute } from "next";

const BASE_URL = "https://jp-buy.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = ["zh", "en", "ja"] as const;
  
  // Static pages
  const staticPages = [
    { path: "", priority: 1.0 },
    { path: "/products", priority: 0.9 },
    { path: "/cart", priority: 0.8 },
    { path: "/login", priority: 0.7 },
    { path: "/register", priority: 0.7 },
    { path: "/checkout", priority: 0.8 },
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
