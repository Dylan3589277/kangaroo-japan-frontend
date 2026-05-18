import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const DEFAULT_BACKEND_API_BASE_URL = "https://kangaroo-japan-backend.vercel.app/api/v1";
const backendOrigin = process.env.KANGAROO_JAPAN_BACKEND_ORIGIN || process.env.NEXT_PUBLIC_BACKEND_ORIGIN;
const backendRewriteDestination =
  process.env.KANGAROO_JAPAN_BACKEND_API_URL ||
  (backendOrigin ? `${backendOrigin.replace(/\/$/, "")}/api/v1` : DEFAULT_BACKEND_API_BASE_URL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (!backendRewriteDestination) return [];
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendRewriteDestination.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.amazon.co.jp" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "**.ssl-images-amazon.com" },
      { protocol: "https", hostname: "**.mercari.com" },
      { protocol: "https", hostname: "static.mercdn.net" },
      { protocol: "https", hostname: "**.mercdn.net" },
      { protocol: "https", hostname: "assets.mercari-shops-static.com" },
      { protocol: "https", hostname: "**.rakuten.co.jp" },
      { protocol: "https", hostname: "**.r10s.jp" },
      { protocol: "https", hostname: "**.shopping.yahoo.co.jp" },
      { protocol: "https", hostname: "**.auctions.yahoo.co.jp" },
      { protocol: "https", hostname: "**.yimg.jp" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
};

export default withNextIntl(nextConfig);
