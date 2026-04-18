import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/checkout", "/profile", "/orders", "/cart"],
      },
    ],
    sitemap: "https://jp-buy.com/sitemap.xml",
    host: "https://jp-buy.com",
  };
}
