import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://jp-buy.com";

// Languages to include in sitemap (exclude Japanese - noindex)
const SITEMAP_LANGUAGES = routing.locales.filter((l) => l !== "ja");

export default function sitemap(): MetadataRoute.Sitemap {
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
  for (const lang of SITEMAP_LANGUAGES) {
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
