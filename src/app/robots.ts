import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/checkout", "/profile", "/orders"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/_next/", "/checkout", "/profile", "/orders"],
      },
    ],
    sitemap: "https://jp-buy.com/sitemap.xml",
    host: "https://jp-buy.com",
  };
}
