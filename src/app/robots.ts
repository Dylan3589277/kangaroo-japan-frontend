import { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/_next/",
          "/*/admin/",
          "/*/warehouse/",
          "/*/orders/",
          "/*/profile/",
          "/*/addresses/",
          "/*/deposit/",
          "/*/cart/",
          "/*/bids/",
          "/*/sign/",
          "/*/messages/",
          "/*/vip/",
          "/*/coupons/",
          "/*/shop/",
          "/*/mnp/",
        ],
      },
    ],
    // Only declare sitemaps that actually exist on the server.
    // Per-language sitemaps (/zh/sitemap.xml etc.) do NOT exist and must not be listed.
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
