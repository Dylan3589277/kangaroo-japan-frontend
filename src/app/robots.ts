import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

const BASE_URL = "https://jp-buy.com";

export default function robots(): MetadataRoute.Robots {
  // Languages to include in sitemap (exclude Japanese - noindex)
  const sitemapLanguages = routing.locales.filter((l) => l !== "ja");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "Baiduspider",
        allow: "/",
      },
      {
        userAgent: "NaverBot",
        allow: "/",
      },
      {
        userAgent: "Yeti",
        allow: "/",
      },
      {
        userAgent: "Bingbot",
        allow: "/",
      },
    ],
    sitemap: [
      `${BASE_URL}/sitemap.xml`,
      ...sitemapLanguages.map((lang) => `${BASE_URL}/${lang}/sitemap.xml`),
    ],
  };
}
